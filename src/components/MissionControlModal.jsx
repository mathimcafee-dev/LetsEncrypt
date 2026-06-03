// MissionControlModal.jsx — v2: clear step-by-step pipeline UI
import { useState, useEffect, useRef } from 'react'

function pad(n) { return String(n).padStart(2, '0') }
function formatClock(ms) {
  const s = Math.floor(ms / 1000)
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

// ── Step definitions with icons and descriptions ──────────────────────────────
const STEP_META = [
  { icon: '📤', phase: 'SUBMIT'   },
  { icon: '🔑', phase: 'KEYGEN'   },
  { icon: '🌐', phase: 'DNS'      },
  { icon: '✅', phase: 'VALIDATE' },
  { icon: '🎫', phase: 'ISSUE'    },
  { icon: '🚀', phase: 'INSTALL'  },
]

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = '#ff8c7a' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid rgba(0,0,0,0.09)`,
      borderTopColor: color,
      animation: 'mcv2-spin 0.65s linear infinite',
      flexShrink: 0,
    }}/>
  )
}

// ── Step Row ──────────────────────────────────────────────────────────────────
function StepRow({ step, index, isLast }) {
  const { status, label, detail } = step
  const meta = STEP_META[index] || { icon: '•', phase: '' }

  const isDone    = status === 'done'
  const isActive  = status === 'active'
  const isError   = status === 'error'
  const isSkipped = status === 'skipped'
  const isPending = status === 'pending'

  const lineColor = isDone ? '#22c55e' : isActive ? '#ff8c7a' : 'rgba(0,0,0,0.06)'

  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {/* Left: connector line + node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        {/* Node */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
          background: isDone    ? 'rgba(34,197,94,0.15)'
                    : isActive  ? 'rgba(255,140,122,0.15)'
                    : isError   ? 'rgba(248,113,113,0.12)'
                    : isSkipped ? 'rgba(184,120,0,0.07)'
                    : 'rgba(0,0,0,0.03)',
          border: `1.5px solid ${
            isDone    ? 'rgba(34,197,94,0.5)'
            : isActive  ? 'rgba(255,140,122,0.5)'
            : isError   ? 'rgba(248,113,113,0.4)'
            : isSkipped ? 'rgba(251,191,36,0.35)'
            : 'rgba(0,0,0,0.07)'
          }`,
          transition: 'all 0.4s ease',
          position: 'relative', zIndex: 1,
        }}>
          {isActive  ? <Spinner size={14}/> :
           isDone    ? <span style={{ fontSize: 13 }}>✓</span> :
           isError   ? <span style={{ fontSize: 13, color: '#f87171' }}>✗</span> :
           isSkipped ? <span style={{ fontSize: 12 }}>⏸</span> :
                       <span style={{ opacity: 0.35, fontSize: 13 }}>{meta.icon}</span>}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: 1.5, flex: 1, minHeight: 20,
            background: lineColor,
            transition: 'background 0.6s ease',
            marginTop: 2, marginBottom: 2,
          }}/>
        )}
      </div>

      {/* Right: content */}
      <div style={{
        flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 18,
        paddingTop: 6,
      }}>
        {/* Phase label + step label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: isDone    ? '#22c55e'
                 : isActive  ? '#ff8c7a'
                 : isError   ? '#f87171'
                 : isSkipped ? '#fbbf24'
                 : 'rgba(255,255,255,0.2)',
            fontFamily: 'monospace',
            transition: 'color 0.4s',
          }}>{meta.phase}</span>
          {isActive && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              background: 'rgba(255,140,122,0.15)', color: '#ff8c7a',
              letterSpacing: '0.08em', animation: 'mcv2-pulse 2s ease-in-out infinite',
            }}>RUNNING</span>
          )}
        </div>

        <div style={{
          fontSize: 13, fontWeight: isActive || isDone ? 600 : 400,
          color: isDone    ? '#ffffff'
               : isActive  ? '#ffffff'
               : isError   ? '#f87171'
               : isSkipped ? '#fbbf24'
               : 'rgba(255,255,255,0.3)',
          lineHeight: 1.3,
          transition: 'color 0.4s',
        }}>
          {label}
        </div>

        {detail && (
          <div style={{
            fontSize: 11, marginTop: 4,
            fontFamily: isActive || isDone ? 'monospace' : 'inherit',
            color: isError   ? '#f87171'
                 : isActive  ? 'rgba(255,140,122,0.8)'
                 : isDone    ? 'rgba(255,255,255,0.4)'
                 : isSkipped ? 'rgba(251,191,36,0.6)'
                 : 'rgba(255,255,255,0.25)',
            lineHeight: 1.5,
            wordBreak: 'break-all',
          }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Floating pill (minimised) ─────────────────────────────────────────────────
function FloatingPill({ action, domain, elapsedMs, currentStep, onExpand }) {
  return (
    <div onClick={onExpand} style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'rgba(12,0,0,0.95)', border: '1px solid rgba(255,140,122,0.4)',
      borderRadius: 40, padding: '10px 18px 10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(12px)',
    }}>
      <Spinner size={10} color="#ff8c7a"/>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
          {action === 'reissue' ? 'Reissuing' : 'Renewing'} · {domain}
        </span>
        {currentStep && (
          <span style={{ fontSize: 10, color: 'rgba(255,140,122,0.7)', marginTop: 1 }}>
            {currentStep}
          </span>
        )}
      </div>
      <span style={{
        fontSize: 12, color: '#ff8c7a', fontFamily: 'monospace', fontWeight: 700,
        marginLeft: 4,
      }}>
        {formatClock(elapsedMs)}
      </span>
    </div>
  )
}

// ── Success Screen ────────────────────────────────────────────────────────────
function SuccessScreen({ action, domain, probeStatus, onDone, onViewCert }) {
  const p          = probeStatus && probeStatus !== 'probing' ? probeStatus : null
  const isProbing  = probeStatus === 'probing'
  const certIssued = p?.ok && p?.cert
  const reachable  = p?.ok && p?.https?.reachable
  const confirmed  = p?.ok && p?.live_confirmed

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '36px 28px 28px', textAlign: 'center',
    }}>
      {/* Animated checkmark */}
      <div style={{ marginBottom: 20, animation: 'mcv2-pop 0.5s cubic-bezier(.16,1,.3,1)' }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="30" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.5)" strokeWidth="1.5"/>
          <path d="M20 32l9 9 16-16" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
            style={{ strokeDasharray: 40, strokeDashoffset: 0, animation: 'mcv2-draw 0.5s ease 0.2s both' }}/>
        </svg>
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
        {action === 'reissue' ? 'Certificate Reissued' : 'Certificate Renewed'}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginBottom: 24 }}>
        {domain}
      </div>

      {/* Proof cards */}
      {(p || isProbing) && (
        <div style={{
          width: '100%', maxWidth: 360,
          border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12,
          overflow: 'hidden', marginBottom: 20,
        }}>
          {/* Cert card */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            background: certIssued ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: certIssued ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>
              {isProbing ? '⏳' : certIssued ? '🔐' : '❓'}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: certIssued ? '#22c55e' : 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                Certificate Issued
              </div>
              {certIssued && (
                <>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#ff8c7a', wordBreak: 'break-all' }}>
                    {p.cert.serial}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    {p.cert.not_before} → {p.cert.not_after}
                  </div>
                </>
              )}
              {isProbing && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Verifying…</div>}
            </div>
            {certIssued && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(34,197,94,0.15)', color: '#22c55e', letterSpacing: '0.06em',
              }}>VALID</span>
            )}
          </div>

          {/* Live server card */}
          <div style={{
            padding: '14px 16px',
            background: reachable ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.01)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: reachable ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>
              {isProbing ? '⏳' : reachable ? '🌐' : '⚠️'}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: reachable ? '#22c55e' : 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                Live Server
              </div>
              {reachable && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                  HTTPS · {p.https.latency_ms}ms{p.https.hsts ? ' · HSTS ✓' : ''}
                </div>
              )}
              {p && !reachable && (
                <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.6)' }}>
                  {p.https?.error || 'Not reachable yet'}
                </div>
              )}
              {isProbing && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Checking…</div>}
            </div>
            {reachable && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10,
                background: 'rgba(34,197,94,0.15)', color: '#22c55e', letterSpacing: '0.06em',
              }}>LIVE</span>
            )}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onViewCert} style={{
          fontSize: 13, fontWeight: 600, padding: '10px 22px', borderRadius: 8,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          color: '#22c55e', cursor: 'pointer', fontFamily: 'inherit',
        }}>View Certificate</button>
        <button onClick={onDone} style={{
          fontSize: 13, fontWeight: 600, padding: '10px 22px', borderRadius: 8,
          background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)',
          color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit',
        }}>Done</button>
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function MissionControlModal({
  visible, action, domain, steps, busy,
  backgroundProcessing, serial, liveConfirmed, probeStatus,
  onDismiss, onViewCert,
}) {
  const [minimised, setMinimised] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(Date.now())
  const timerRef = useRef(null)

  useEffect(() => {
    if (visible && busy) { startRef.current = Date.now(); setElapsedMs(0); setMinimised(false) }
  }, [visible])

  useEffect(() => {
    if (visible && busy) {
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startRef.current), 500)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [visible, busy])

  if (!visible) return null

  const isDone    = !busy && steps.length > 0 && steps.every(s => s.status === 'done' || s.status === 'skipped')
  const hasError  = steps.some(s => s.status === 'error')
  const doneCount = steps.filter(s => s.status === 'done').length
  const progressPct = isDone ? 100 : Math.round((doneCount / Math.max(steps.length, 1)) * 100)
  const activeStep = steps.find(s => s.status === 'active')
  const actionLabel = action === 'reissue' ? 'Reissuing' : 'Renewing'

  if (minimised) {
    return (
      <FloatingPill
        action={action} domain={domain} elapsedMs={elapsedMs}
        currentStep={activeStep?.label}
        onExpand={() => setMinimised(false)}
      />
    )
  }

  return (
    <>
      <style>{`
        @keyframes mcv2-spin    { to { transform: rotate(360deg) } }
        @keyframes mcv2-pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes mcv2-pop     { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes mcv2-draw    { from{stroke-dashoffset:40} to{stroke-dashoffset:0} }
        @keyframes mcv2-in      { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mcv2-fadein  { from{opacity:0} to{opacity:1} }
        @keyframes mcv2-slidein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        animation: 'mcv2-fadein 0.2s ease',
      }}/>

      {/* Modal */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, pointerEvents: 'none',
      }}>
        <div style={{
          width: '100%', maxWidth: 460,
          background: '#0c0505',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 18,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,140,122,0.06)',
          overflow: 'hidden',
          pointerEvents: 'all',
          animation: 'mcv2-in 0.3s cubic-bezier(.16,1,.3,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {busy && <Spinner size={14} color="#ff8c7a"/>}
              {!busy && isDone && (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'rgba(34,197,94,0.2)', border: '1.5px solid #22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: '#22c55e',
                }}>✓</div>
              )}
              {!busy && hasError && (
                <div style={{ fontSize: 14 }}>⚠️</div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {isDone
                    ? `Certificate ${action === 'reissue' ? 'Reissued' : 'Renewed'}`
                    : hasError ? 'Something went wrong'
                    : `${actionLabel} Certificate`}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1, fontFamily: 'monospace' }}>
                  {domain}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Elapsed timer */}
              {busy && (
                <div style={{
                  fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                  color: '#ff8c7a', background: 'rgba(255,140,122,0.08)',
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid rgba(255,140,122,0.2)',
                }}>
                  {formatClock(elapsedMs)}
                </div>
              )}
              {/* Minimise */}
              {busy && (
                <button onClick={() => setMinimised(true)} title="Minimise" style={{
                  background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 6, cursor: 'pointer', padding: '5px 8px',
                  color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1,
                  fontFamily: 'inherit',
                }}>↙ min</button>
              )}
              {/* Close (only when done or error) */}
              {(isDone || hasError) && (
                <button onClick={onDismiss} style={{
                  background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 6, cursor: 'pointer', padding: '5px 8px',
                  color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1,
                }}>×</button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, background: 'rgba(0,0,0,0.04)' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: hasError
                ? 'linear-gradient(90deg, #f87171, #fca5a5)'
                : isDone
                  ? 'linear-gradient(90deg, #22c55e, #86efac)'
                  : 'linear-gradient(90deg, #2a6b5c, #ff8c7a)',
              transition: 'width 0.8s cubic-bezier(.16,1,.3,1)',
            }}/>
          </div>

          {/* Body */}
          {isDone && !hasError ? (
            <SuccessScreen
              action={action} domain={domain}
              probeStatus={probeStatus}
              onDone={onDismiss} onViewCert={onViewCert}
            />
          ) : (
            <div style={{ padding: '24px 20px' }}>

              {/* Current step callout — shown while active */}
              {activeStep && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 20,
                  background: 'rgba(255,140,122,0.07)',
                  border: '1px solid rgba(255,140,122,0.2)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  animation: 'mcv2-slidein 0.25s ease',
                }}>
                  <Spinner size={12} color="#ff8c7a"/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                      {activeStep.label}
                    </div>
                    {activeStep.detail && (
                      <div style={{ fontSize: 10, color: 'rgba(255,140,122,0.65)', marginTop: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {activeStep.detail}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', flexShrink: 0 }}>
                    step {steps.findIndex(s => s.status === 'active') + 1}/{steps.length}
                  </div>
                </div>
              )}

              {/* Step list */}
              <div>
                {steps.map((step, i) => (
                  <StepRow
                    key={i}
                    step={step}
                    index={i}
                    isLast={i === steps.length - 1}
                  />
                ))}
              </div>

              {/* Footer messages */}
              <div style={{ marginTop: 16 }}>
                {busy && !hasError && (() => {
                  const installStep = steps[5]
                  const isInstalling = installStep?.status === 'active'
                  return (
                    <div style={{
                      fontSize: 11, color: 'rgba(255,255,255,0.25)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: '#ff8c7a',
                        animation: 'mcv2-pulse 1.6s ease-in-out infinite',
                        flexShrink: 0,
                      }}/>
                      {isInstalling
                        ? 'Install cron runs every 2 min — pushing cert to your server automatically.'
                        : 'DNS validation typically takes 1–3 minutes. You can minimise and keep working.'}
                    </div>
                  )
                })()}

                {backgroundProcessing && !busy && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.18)',
                    fontSize: 11, color: 'rgba(251,191,36,0.8)',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <span style={{ flexShrink: 0, fontSize: 13 }}>⏳</span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Running in background</div>
                      <div style={{ opacity: 0.75 }}>Your cert will issue and install automatically. You can close this.</div>
                    </div>
                  </div>
                )}

                {hasError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(248,113,113,0.06)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    fontSize: 11, color: '#f87171',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Something went wrong</div>
                    <div style={{ opacity: 0.75, marginBottom: 10 }}>Your existing certificate is still active.</div>
                    <button onClick={onDismiss} style={{
                      fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 6,
                      background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(192,57,43,0.2)',
                      color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
                    }}>Dismiss</button>
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
