// MissionControlModal.jsx
// Full-screen overlay modal for certificate reissue/renew progress
// Shows live step-by-step progress with elapsed timers, mission clock,
// animated progress bar, and final serial number confirmation screen.

import { useState, useEffect, useRef } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0') }

function formatClock(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${pad(m)}:${pad(s % 60)}`
}

function formatStepTime(ms) {
  if (ms == null) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Step icon ─────────────────────────────────────────────────────────────────

function StepIcon({ status }) {
  if (status === 'done') return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#10b981"/>
      <path d="M5 9l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  if (status === 'error') return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#f87171"/>
      <path d="M6 6l6 6M12 6l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
  if (status === 'active') return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2.5px solid #10b981', borderTopColor: 'transparent',
      animation: 'mc-spin 0.7s linear infinite', flexShrink: 0,
    }}/>
  )
  // pending
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0,
    }}/>
  )
}

// ── Floating pill (minimised state) ──────────────────────────────────────────

function FloatingPill({ action, domain, elapsedMs, onExpand }) {
  return (
    <div
      onClick={onExpand}
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: 'transparent', border: '1px solid #10b981',
        borderRadius: 32, padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: 'pointer', boxShadow: '0 4px 24px rgba(16,185,129,0.25)',
        transition: 'transform 0.15s ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', background: '#10b981',
        animation: 'mc-pulse 1.4s ease-in-out infinite',
      }}/>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8f5f4', fontFamily: 'inherit' }}>
        {action === 'reissue' ? '🔐' : '♻️'} {action === 'reissue' ? 'Reissuing' : 'Renewing'} {domain}
      </span>
      <span style={{ fontSize: 12, color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>
        {formatClock(elapsedMs)}
      </span>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ action, domain, serial, liveConfirmed, probeStatus, onDone, onViewCert }) {
  const isProbing  = probeStatus === 'probing'
  const p          = probeStatus && probeStatus !== 'probing' ? probeStatus : null
  const confirmed  = p?.ok && p?.live_confirmed
  const certIssued = p?.ok && p?.cert
  const reachable  = p?.ok && p?.https?.reachable
  const probeErr   = p && !p.ok

  const displaySerial = p?.cert?.serial || p?.serial || serial

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 28px', textAlign: 'center',
    }}>
      {/* Checkmark */}
      <div style={{ marginBottom: 20 }}>
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ animation: 'mc-pop 0.4s cubic-bezier(.16,1,.3,1)' }}>
          <circle cx="36" cy="36" r="34" fill="none" stroke={confirmed ? '#10b981' : '#10b981'} strokeWidth="2.5"/>
          <path d="M22 36l10 10 18-18" stroke="#10b981" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: '#e8f5f4', marginBottom: 4 }}>
        Certificate {action === 'reissue' ? 'Reissued' : 'Renewed'}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(232,245,244,0.5)', marginBottom: 24, fontFamily: 'monospace' }}>
        {domain}
      </div>

      {/* Proof card */}
      <div style={{
        width: '100%', maxWidth: 380,
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: 22,
      }}>

        {/* PROOF 1 — Certificate issued */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: certIssued ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: certIssued ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {isProbing ? '⏳' : certIssued ? '🔐' : '❓'}
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: certIssued ? '#e8f5f4' : 'rgba(232,245,244,0.5)', marginBottom: 4 }}>
              Certificate Issued
            </div>
            {isProbing && (
              <div style={{ fontSize: 11, color: 'rgba(232,245,244,0.4)' }}>Parsing certificate…</div>
            )}
            {certIssued && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#10b981', wordBreak: 'break-all' }}>
                  Serial: {p.cert.serial}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(232,245,244,0.4)' }}>
                  {p.cert.algorithm}{p.cert.key_size ? ` ${p.cert.key_size}-bit` : ''} · valid {p.cert.not_before} → {p.cert.not_after}
                </div>
                {p.cert.issuer && (
                  <div style={{ fontSize: 11, color: 'rgba(232,245,244,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.cert.issuer.replace(/CN=/g,'').split(',')[0].trim()}
                  </div>
                )}
              </div>
            )}
            {p && !certIssued && p.pem_error && (
              <div style={{ fontSize: 11, color: '#fca5a5' }}>{p.pem_error}</div>
            )}
          </div>
          {certIssued && (
            <div style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: 'rgba(16,185,129,0.15)', color: '#10b981', flexShrink: 0,
            }}>VERIFIED</div>
          )}
        </div>

        {/* PROOF 2 — Live server */}
        <div style={{
          padding: '14px 16px',
          background: reachable ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: reachable ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            {isProbing ? '⏳' : reachable ? '🌐' : '⚠️'}
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: reachable ? '#e8f5f4' : 'rgba(232,245,244,0.5)', marginBottom: 4 }}>
              Live Server Check
            </div>
            {isProbing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #10b981', borderTopColor: 'transparent', animation: 'mc-spin 0.7s linear infinite' }}/>
                <span style={{ fontSize: 11, color: 'rgba(232,245,244,0.4)' }}>Connecting to {domain}…</span>
              </div>
            )}
            {reachable && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                  HTTPS responding · {p.https.latency_ms}ms
                </div>
                <div style={{ fontSize: 11, color: 'rgba(232,245,244,0.4)' }}>
                  HTTP {p.https.status_code}{p.https.hsts ? ' · HSTS ✓' : ''}
                </div>
              </div>
            )}
            {p && !reachable && (
              <div style={{ fontSize: 11, color: '#fca5a5' }}>
                {p.https?.error || 'Server not reachable over HTTPS'}
              </div>
            )}
          </div>
          {reachable && (
            <div style={{
              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              background: 'rgba(16,185,129,0.15)', color: '#10b981', flexShrink: 0,
            }}>LIVE</div>
          )}
        </div>
      </div>

      {/* Final verdict banner */}
      {!isProbing && p && (
        <div style={{
          width: '100%', maxWidth: 380,
          padding: '11px 16px', borderRadius: 10, marginBottom: 22,
          background: confirmed
            ? 'rgba(16,185,129,0.1)'
            : certIssued && !reachable
              ? 'rgba(251,191,36,0.1)'
              : 'rgba(248,113,113,0.08)',
          border: `1px solid ${confirmed ? 'rgba(16,185,129,0.3)' : certIssued && !reachable ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.2)'}`,
          fontSize: 12, fontWeight: 600,
          color: confirmed ? '#10b981' : certIssued && !reachable ? '#fbbf24' : '#fca5a5',
        }}>
          {confirmed
            ? '✓ Certificate issued and server is live over HTTPS'
            : certIssued && !reachable
              ? '⚠ Certificate issued — server not yet reachable (may need 1–2 min to propagate)'
              : probeErr
                ? '✗ Probe failed — certificate was issued, check server manually'
                : '⚠ Verification incomplete'}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onViewCert} style={{
          fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8,
          background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981',
          color: '#10b981', cursor: 'pointer', fontFamily: 'inherit',
        }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(16,185,129,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(16,185,129,0.12)'}>
          View Certificate
        </button>
        <button onClick={onDone} style={{
          fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 8,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#e8f5f4', cursor: 'pointer', fontFamily: 'inherit',
        }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
          Done
        </button>
      </div>
    </div>
  )
}

// ── Main MissionControlModal ──────────────────────────────────────────────────

export default function MissionControlModal({
  visible,
  action,
  domain,
  steps,
  busy,
  backgroundProcessing,
  serial,
  liveConfirmed,
  probeStatus,
  onDismiss,
  onViewCert,
}) {
  const [minimised, setMinimised] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(Date.now())
  const timerRef = useRef(null)

  // Reset start time when modal becomes visible
  useEffect(() => {
    if (visible && busy) {
      startRef.current = Date.now()
      setElapsedMs(0)
    }
  }, [visible])

  // Global clock — runs while busy
  useEffect(() => {
    if (visible && busy) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startRef.current)
      }, 500)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [visible, busy])

  if (!visible) return null

  const isDone    = !busy && steps.length > 0 && steps.every(s => s.status === 'done' || s.status === 'skipped')
  const hasError  = steps.some(s => s.status === 'error')
  const activeIdx = steps.findIndex(s => s.status === 'active')
  const doneCount = steps.filter(s => s.status === 'done').length
  const progress  = isDone ? 100 : Math.round((doneCount / steps.length) * 100)

  const actionLabel = action === 'reissue' ? 'Reissue' : 'Renewal'
  const actionIcon  = action === 'reissue' ? '🔐' : '♻️'

  if (minimised) {
    return <FloatingPill action={action} domain={domain} elapsedMs={elapsedMs} onExpand={() => setMinimised(false)}/>
  }

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes mc-spin  { to { transform: rotate(360deg) } }
        @keyframes mc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes mc-pop   { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        @keyframes mc-slidein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mc-bar   { from{width:0%} to{width:var(--bar-w)} }
        @keyframes mc-circle { from{stroke-dashoffset:239} to{stroke-dashoffset:0} }
        @keyframes mc-overlay-in { from{opacity:0} to{opacity:1} }
        @keyframes mc-modal-in { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        animation: 'mc-overlay-in 0.2s ease',
      }}/>

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', maxWidth: 480,
          background: 'transparent',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1)',
          overflow: 'hidden',
          pointerEvents: 'all',
          animation: 'mc-modal-in 0.28s cubic-bezier(.16,1,.3,1)',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(16,185,129,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{actionIcon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f5f4' }}>
                  {actionLabel} in progress
                </div>
                <div style={{ fontSize: 11, color: 'rgba(232,245,244,0.5)', fontFamily: 'monospace', marginTop: 1 }}>
                  {domain}
                </div>
              </div>
            </div>
            {/* Clock + controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {busy && (
                <div style={{
                  fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
                  color: '#10b981', background: 'rgba(16,185,129,0.1)',
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid rgba(16,185,129,0.2)',
                  minWidth: 52, textAlign: 'center',
                }}>
                  {formatClock(elapsedMs)}
                </div>
              )}
              {!isDone && busy && (
                <button onClick={() => setMinimised(true)} title="Run in background" style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'rgba(232,245,244,0.4)', fontSize: 16, lineHeight: 1,
                  transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#e8f5f4'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,245,244,0.4)'}
                  title="Minimise — runs in background">
                  ↙
                </button>
              )}
              {(isDone || hasError) && (
                <button onClick={onDismiss} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(232,245,244,0.4)', fontSize: 18, lineHeight: 1,
                  padding: 4, transition: 'color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = '#e8f5f4'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(232,245,244,0.4)'}>
                  ×
                </button>
              )}
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: hasError
                ? 'linear-gradient(90deg, #f87171, #fca5a5)'
                : 'linear-gradient(90deg, #10b981, #34d399)',
              transition: 'width 0.6s cubic-bezier(.16,1,.3,1)',
              borderRadius: '0 2px 2px 0',
            }}/>
          </div>

          {/* ── Body ── */}
          {isDone && !hasError ? (
            <SuccessScreen
              action={action}
              domain={domain}
              serial={serial}
              liveConfirmed={liveConfirmed}
              probeStatus={probeStatus}
              onDone={onDismiss}
              onViewCert={onViewCert}
            />
          ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Step counter */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(232,245,244,0.4)' }}>
                  {hasError ? 'Failed at step' : `Step ${Math.min(doneCount + 1, steps.length)} of ${steps.length}`}
                </span>
                {activeIdx >= 0 && (
                  <span style={{ fontSize: 11, color: 'rgba(232,245,244,0.4)', fontFamily: 'monospace' }}>
                    {steps[activeIdx]?.label}
                  </span>
                )}
              </div>

              {/* Steps list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {steps.map((step, i) => {
                  const isActive  = step.status === 'active'
                  const isDoneStep= step.status === 'done'
                  const isErr     = step.status === 'error'
                  const isPending = step.status === 'pending'
                  const isSkipped = step.status === 'skipped'

                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '10px 12px', borderRadius: 10,
                        background: isActive
                          ? 'rgba(16,185,129,0.08)'
                          : isErr
                            ? 'rgba(248,113,113,0.08)'
                            : 'transparent',
                        border: isActive
                          ? '1px solid rgba(16,185,129,0.2)'
                          : isErr
                            ? '1px solid rgba(248,113,113,0.2)'
                            : '1px solid transparent',
                        transition: 'all 0.3s ease',
                        animation: isActive ? 'mc-slidein 0.25s ease' : 'none',
                      }}
                    >
                      <div style={{ paddingTop: 1, flexShrink: 0 }}>
                        <StepIcon status={step.status}/>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: isActive || isDoneStep ? 600 : 500,
                          color: isDoneStep ? '#e8f5f4'
                            : isActive     ? '#e8f5f4'
                            : isErr        ? '#f87171'
                            : isSkipped    ? 'rgba(232,245,244,0.3)'
                            : 'rgba(232,245,244,0.35)',
                          transition: 'color 0.3s',
                        }}>
                          {step.label}
                        </div>
                        {step.detail && (
                          <div style={{
                            fontSize: 11, marginTop: 3,
                            fontFamily: 'monospace',
                            color: isErr ? '#fca5a5'
                              : isActive ? 'rgba(16,185,129,0.8)'
                              : 'rgba(232,245,244,0.4)',
                            wordBreak: 'break-all',
                          }}>
                            {step.detail}
                          </div>
                        )}
                      </div>
                      {/* Per-step elapsed time */}
                      {isDoneStep && step.elapsed != null && (
                        <div style={{
                          fontSize: 10, color: 'rgba(232,245,244,0.3)',
                          fontFamily: 'monospace', flexShrink: 0, paddingTop: 2,
                        }}>
                          {formatStepTime(step.elapsed)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 16 }}>
                {busy && !hasError && (
                  <div style={{
                    fontSize: 11, color: 'rgba(232,245,244,0.35)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#10b981',
                      animation: 'mc-pulse 1.4s ease-in-out infinite',
                    }}/>
                    DNS validation typically takes 1–3 minutes. You can minimise this and keep working.
                  </div>
                )}
                {backgroundProcessing && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                    fontSize: 12, color: 'rgba(251,191,36,0.9)', display: 'flex', gap: 10,
                  }}>
                    <span style={{ flexShrink: 0 }}>⏳</span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Processing in the background</div>
                      <div style={{ opacity: 0.8 }}>
                        DNS validation is running. Your cert will issue and install automatically — no need to keep this open.
                      </div>
                    </div>
                  </div>
                )}
                {hasError && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                    fontSize: 12, color: '#fca5a5',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Something went wrong</div>
                    <div style={{ opacity: 0.8 }}>
                      Check the error above. Your existing certificate is still active. Try again or contact support.
                    </div>
                    <button onClick={onDismiss} style={{
                      marginTop: 10, fontSize: 12, fontWeight: 600,
                      padding: '7px 14px', borderRadius: 7,
                      background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
                      color: '#fca5a5', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
