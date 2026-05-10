import { useState, useEffect } from 'react'
import { Lock, Shield, RefreshCw, Eye, EyeOff, Download, FileText,
         CheckCircle, AlertTriangle, Clock, Zap, ArrowRight,
         Activity, Trash2, RotateCcw, ChevronRight, Bell } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import ProGate from '../components/ProGate'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import '../styles/design-v2.css'

// ── Helpers ───────────────────────────────────────────────────────────
const fmtDate = (iso) => iso ? format(new Date(iso), 'MMM d, yyyy') : '—'
const fmtAgo  = (iso) => iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : '—'

function statusColor(status) {
  return { active:'var(--v2-green)', archived:'var(--v2-amber)', revoked:'var(--v2-red)' }[status] || 'var(--v2-text-3)'
}

// ── AuditRow ──────────────────────────────────────────────────────────
function AuditRow({ entry }) {
  const icons = {
    created: <Shield size={12} color='var(--v2-green)' />,
    fetched: <Eye size={12} color='#2563eb' />,
    rotated: <RotateCcw size={12} color='#d97706' />,
    archived:<Clock size={12} color='var(--v2-text-3)' />,
    deleted: <Trash2 size={12} color='var(--v2-red)' />,
    viewed:  <Eye size={12} color='var(--v2-text-3)' />,
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
                  padding:'10px 16px', borderBottom:'0.5px solid var(--v2-border)',
                  fontSize:12 }}>
      <div style={{ flexShrink:0 }}>{icons[entry.action] || <Activity size={12} />}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ fontWeight:500, color:'var(--v2-text)' }}>{entry.domain}</span>
        <span style={{ color:'var(--v2-text-3)', marginLeft:8 }}>
          {entry.action} · {entry.triggered_by}
        </span>
      </div>
      <div style={{ fontSize:11, color:'var(--v2-text-3)', flexShrink:0 }}>
        {fmtAgo(entry.created_at)}
      </div>
    </div>
  )
}

// ── KeyCard ────────────────────────────────────────────────────────────
function KeyCard({ keyEntry, onRotate, rotating }) {
  const days = keyEntry.expires_at ? differenceInDays(new Date(keyEntry.expires_at), new Date()) : null
  const isExpiringSoon = days !== null && days < 30

  return (
    <div className="v2-card" style={{ overflow:'hidden' }}>
      {/* Status bar */}
      <div style={{ height:2, background: statusColor(keyEntry.status) }} />
      <div style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
              <span className="v2-mono" style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)' }}>
                {keyEntry.domain}
              </span>
              <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.3px',
                              color: statusColor(keyEntry.status),
                              background: keyEntry.status === 'active' ? 'var(--v2-green-bg)' : 'var(--v2-surface-3)',
                              border:`0.5px solid ${statusColor(keyEntry.status)}30`,
                              borderRadius:3, padding:'1px 6px' }}>
                {keyEntry.status}
              </span>
              {keyEntry.status === 'active' && (
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10,
                                color:'#7c3aed', background:'rgba(124,58,237,0.06)',
                                border:'0.5px solid rgba(124,58,237,0.2)', borderRadius:3, padding:'1px 6px',
                                fontWeight:600 }}>
                  <Lock size={8} /> VAULT SECURED
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
              {keyEntry.algorithm || 'RSA 2048'} · Created {fmtDate(keyEntry.created_at)}
              {keyEntry.expires_at && ` · Expires ${fmtDate(keyEntry.expires_at)}`}
            </div>
          </div>
        </div>

        {isExpiringSoon && keyEntry.status === 'active' && (
          <div className="v2-callout warning" style={{ marginBottom:12, fontSize:11 }}>
            <div className="v2-callout-title" style={{ fontSize:11 }}>Expiring in {days} days</div>
            Rotate now to avoid any disruption.
          </div>
        )}

        {/* Metrics row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
          {[
            { label:'Last accessed', value: keyEntry.last_accessed_at ? fmtAgo(keyEntry.last_accessed_at) : 'Never' },
            { label:'Rotations',     value: keyEntry.rotation_count ?? 0 },
            { label:'Key size',      value: keyEntry.key_size ? `${keyEntry.key_size} bit` : 'RSA 2048' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:'var(--v2-surface-3)', borderRadius:'var(--v2-r-md)',
                                       padding:'8px 10px', border:'0.5px solid var(--v2-border)' }}>
              <div className="v2-section-label" style={{ marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--v2-text)' }}>{String(value)}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {keyEntry.status === 'active' && (
          <div style={{ display:'flex', gap:7 }}>
            <button className="v2-btn v2-btn-sm"
              onClick={() => onRotate(keyEntry)}
              disabled={rotating === keyEntry.id}
              style={{ fontSize:11 }}>
              {rotating === keyEntry.id
                ? <><RefreshCw size={10} className="spin" /> Rotating…</>
                : <><RotateCcw size={10} /> Rotate key</>}
            </button>
            <button className="v2-btn v2-btn-sm" style={{ fontSize:11, color:'var(--v2-text-3)' }}>
              <Activity size={10} /> View audit
            </button>
          </div>
        )}
        {keyEntry.status === 'archived' && (
          <div style={{ fontSize:11, color:'var(--v2-text-3)' }}>
            Archived {fmtAgo(keyEntry.archived_at)} · Auto-deleted in 30 days
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN KeyLocker PAGE
// ══════════════════════════════════════════════════════════════════════
export default function KeyLocker({ nav }) {
  const { user, loading: authLoading } = useAuth()
  const { plan, isPro, loading: planLoading } = usePlan(user)

  const [keys, setKeys]         = useState([])
  const [audit, setAudit]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [rotating, setRotating] = useState(null)
  const [tab, setTab]           = useState('vault')
  const [rotateConfirm, setRotateConfirm] = useState(null)

  // ── Load vault keys and audit log ──────────────────────────────────
  useEffect(() => {
    if (!user || !isPro || planLoading) return
    loadData()
  }, [user?.id, isPro, planLoading])

  const callKeyLocker = async (action, extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      'https://frthcwkntciaakqsppss.supabase.co/functions/v1/keylocker',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...extra }),
      }
    )
    return res.json()
  }

  const loadData = async () => {
    setLoading(true)
    const data = await callKeyLocker('list')
    setKeys(data.keys || [])
    setAudit(data.audit || [])
    setLoading(false)
  }

  // ── Key rotation ───────────────────────────────────────────────────
  const handleRotate = async (keyEntry) => {
    setRotateConfirm(null)
    setRotating(keyEntry.id)
    try {
      const result = await callKeyLocker('rotate', { key_id: keyEntry.id })
      if (result.error) throw new Error(result.error)
      await loadData()
    } catch (err) {
      console.error('Rotation failed:', err)
    }
    setRotating(null)
  }

  // ── Auth guards ────────────────────────────────────────────────────
  if (authLoading || planLoading) {
    return (
      <div className="v2-page" style={{ display:'flex', alignItems:'center',
                                         justifyContent:'center', minHeight:'60vh' }}>
        <RefreshCw size={20} className="spin" color='var(--v2-text-3)' />
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="v2-page" style={{ display:'flex', alignItems:'center',
                                         justifyContent:'center', minHeight:'60vh' }}>
        <div style={{ textAlign:'center', maxWidth:380 }}>
          <div style={{ width:48, height:48, background:'#0a0a0a', borderRadius:'var(--v2-r-xl)',
                         display:'flex', alignItems:'center', justifyContent:'center',
                         margin:'0 auto 16px' }}>
            <Lock size={22} color='white' />
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--v2-text)', marginBottom:8 }}>
            Sign in to access KeyLocker
          </div>
          <button className="v2-btn v2-btn-primary" style={{ padding:'10px 22px', fontSize:14 }}
            onClick={() => nav('/auth')}>
            Sign in <ArrowRight size={13} />
          </button>
        </div>
      </div>
    )
  }

  // ── Non-pro users: show upgrade prompt ────────────────────────────
  if (!isPro) {
    return (
      <div className="v2-page">
        <div className="v2-container" style={{ maxWidth:800, padding:'60px 24px 80px' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ width:64, height:64, borderRadius:'var(--v2-r-xl)', margin:'0 auto 20px',
                           background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                           display:'flex', alignItems:'center', justifyContent:'center',
                           boxShadow:'0 0 0 8px rgba(124,58,237,0.08)' }}>
              <Lock size={28} color='white' />
            </div>
            <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:'-0.6px',
                          marginBottom:10, color:'var(--v2-text)' }}>
              KeyLocker Vault
            </h1>
            <p style={{ fontSize:15, color:'var(--v2-text-2)', lineHeight:1.65,
                         maxWidth:440, margin:'0 auto 28px' }}>
              Encrypted key storage, automatic rotation, and full audit logging —
              built for teams and businesses who need compliance-grade PKI.
            </p>
            <button onClick={() => nav('/pricing')}
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 24px',
                        background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                        color:'white', border:'none', borderRadius:'var(--v2-r-md)',
                        fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              <Zap size={14} /> View KeyLocker plans <ArrowRight size={13} />
            </button>
            <div style={{ marginTop:12, fontSize:11, color:'var(--v2-text-3)' }}>
              From €6.58/month · 14-day money-back guarantee
            </div>
          </div>

          {/* Feature preview */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { icon:<Lock size={16} />,       color:'#7c3aed', title:'Envelope encryption',
                desc:'AES-256-GCM per certificate. DEK wrapped with your personal KEK. Supabase breach alone cannot expose your keys.' },
              { icon:<RotateCcw size={16} />,  color:'#2563eb', title:'Zero-downtime rotation',
                desc:'Issue new cert, archive old key, deploy automatically. Your site stays live throughout. 30-day rollback window.' },
              { icon:<Activity size={16} />,   color:'#059669', title:'Immutable audit log',
                desc:'Every key access logged with who, when, and why. Append-only via RLS. Export for SOC 2 or ISO 27001 audits.' },
              { icon:<Bell size={16} />,       color:'#d97706', title:'Access alerts',
                desc:'Instant email when your key is fetched by an agent or accessed from a new location. Know everything, always.' },
            ].map(({ icon, color, title, desc }) => (
              <div key={title} className="v2-card" style={{ padding:'20px 22px' }}>
                <div style={{ width:34, height:34, borderRadius:'var(--v2-r-md)',
                               display:'flex', alignItems:'center', justifyContent:'center',
                               background:`${color}12`, border:`0.5px solid ${color}20`,
                               color, marginBottom:12 }}>
                  {icon}
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--v2-text)', marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--v2-text-2)', lineHeight:1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── Pro user: full vault UI ────────────────────────────────────────
  const activeKeys   = keys.filter(k => k.status === 'active')
  const archivedKeys = keys.filter(k => k.status === 'archived')

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:960, padding:'40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                      marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:'var(--v2-r-lg)',
                           background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                           display:'flex', alignItems:'center', justifyContent:'center',
                           boxShadow:'0 0 0 4px rgba(124,58,237,0.1)' }}>
              <Lock size={18} color='white' />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h1 className="v2-h1">KeyLocker Vault</h1>
                <span style={{ fontSize:9, fontWeight:700, color:'#7c3aed',
                                background:'rgba(124,58,237,0.08)',
                                border:'0.5px solid rgba(124,58,237,0.2)',
                                borderRadius:3, padding:'2px 7px', textTransform:'uppercase',
                                letterSpacing:'0.4px' }}>
                  PRO
                </span>
              </div>
              <p className="v2-subtitle">
                {user.email} · {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
                {archivedKeys.length > 0 && ` · ${archivedKeys.length} archived`}
              </p>
            </div>
          </div>
          <button className="v2-btn v2-btn-sm" onClick={loadData} style={{ fontSize:12 }}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
          {[
            { label:'Active keys',    value: activeKeys.length,   accent:'#7c3aed' },
            { label:'Archived',       value: archivedKeys.length, accent:'var(--v2-amber)' },
            { label:'Audit events',   value: audit.length,        accent:'var(--v2-text)' },
            { label:'Encryption',     value: 'AES-256',           accent:'var(--v2-green)' },
          ].map(s => (
            <div key={s.label} className="v2-stat" style={{ borderTop:`2px solid ${s.accent}` }}>
              <div className="v2-stat-value" style={{ fontSize:22 }}>{s.value}</div>
              <div className="v2-stat-label" style={{ marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="v2-tablist" style={{ marginBottom:20 }}>
          {[
            { key:'vault', label:'Vault', count: activeKeys.length },
            { key:'archived', label:'Archive', count: archivedKeys.length },
            { key:'audit', label:'Audit Log', count: audit.length },
          ].map(t => (
            <button key={t.key} className={`v2-tablist-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
              <span className="v2-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="v2-empty">
            <div className="v2-empty-icon"><RefreshCw size={20} className="spin" /></div>
            <div className="v2-empty-title">Loading vault…</div>
          </div>
        ) : (
          <>
            {/* Vault tab */}
            {tab === 'vault' && (
              <>
                {activeKeys.length === 0 ? (
                  <div className="v2-empty">
                    <div className="v2-empty-icon"><Lock size={22} /></div>
                    <div className="v2-empty-title">Vault is empty</div>
                    <div className="v2-empty-desc">
                      Issue a certificate to automatically add its key to the KeyLocker vault.
                      New certificates issued while on Pro are stored here automatically.
                    </div>
                    <button className="v2-btn v2-btn-primary" onClick={() => nav('/generate')}>
                      Issue certificate
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {activeKeys.map(k => (
                      <KeyCard key={k.id} keyEntry={k}
                        onRotate={(k) => setRotateConfirm(k)}
                        rotating={rotating} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Archive tab */}
            {tab === 'archived' && (
              <>
                {archivedKeys.length === 0 ? (
                  <div className="v2-empty">
                    <div className="v2-empty-icon"><Clock size={22} /></div>
                    <div className="v2-empty-title">No archived keys</div>
                    <div className="v2-empty-desc">
                      After key rotation, old keys are archived here for 30 days before permanent deletion.
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div className="v2-callout warning" style={{ marginBottom:4 }}>
                      <div className="v2-callout-title">Archived keys</div>
                      These keys are retained for 30 days as a rollback option, then permanently destroyed.
                    </div>
                    {archivedKeys.map(k => (
                      <KeyCard key={k.id} keyEntry={k} onRotate={() => {}} rotating={null} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Audit tab */}
            {tab === 'audit' && (
              <div className="v2-card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'0.5px solid var(--v2-border)',
                               display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div className="v2-section-label">Last 50 events</div>
                  <button className="v2-btn v2-btn-sm" style={{ fontSize:11 }}>
                    Export CSV
                  </button>
                </div>
                {audit.length === 0 ? (
                  <div className="v2-empty" style={{ padding:'40px 24px' }}>
                    <div className="v2-empty-title">No audit events yet</div>
                  </div>
                ) : (
                  <div>
                    {audit.map(e => <AuditRow key={e.id} entry={e} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Rotate confirmation modal */}
        {rotateConfirm && (
          <div className="v2-modal-bg" onClick={e => e.target === e.currentTarget && setRotateConfirm(null)}>
            <div className="v2-modal" style={{ maxWidth:440 }}>
              <div className="v2-modal-head">
                <div>
                  <div className="v2-modal-title">Rotate key for {rotateConfirm.domain}?</div>
                  <div className="v2-modal-subtitle">
                    A new certificate + key will be issued and deployed automatically
                  </div>
                </div>
              </div>
              <div className="v2-modal-body">
                <div className="v2-callout tip" style={{ marginBottom:14 }}>
                  <div className="v2-callout-title">Zero downtime</div>
                  The agent installs the new certificate before the old key is archived.
                  Your site stays live throughout. Old key archived for 30 days as rollback.
                </div>
                <div style={{ fontSize:13, color:'var(--v2-text-2)', lineHeight:1.65 }}>
                  This will trigger a new ACME issuance for <strong>{rotateConfirm.domain}</strong> and
                  dispatch an install job to your registered agent. If no agent is active, the new
                  certificate will be available for manual download.
                </div>
              </div>
              <div className="v2-modal-foot">
                <button className="v2-btn" onClick={() => setRotateConfirm(null)}>Cancel</button>
                <button onClick={() => handleRotate(rotateConfirm)}
                  style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'8px 16px',
                            background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                            color:'white', border:'none', borderRadius:'var(--v2-r-md)',
                            fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  <RotateCcw size={13} /> Rotate now
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
