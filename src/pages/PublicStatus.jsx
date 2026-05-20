// PublicStatus.jsx — Public shareable SSL status page at /status/:username
import { useState, useEffect } from 'react'
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function gradeStyle(grade) {
  if (!grade || grade === 'F') return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
  if (grade === 'D') return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  if (grade === 'C') return { color: '#ca8a04', bg: '#fefce8', border: '#fef08a' }
  if (grade === 'B') return { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }
  if (grade === 'A') return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
  if (grade === 'A+') return { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' }
  return { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
}

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function PublicStatus({ username: propUsername, nav }) {
  // Support /status/username URL pattern
  const username = propUsername || window.location.pathname.split('/status/')[1]?.split('/')[0] || ''

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!username) { setError('No username provided'); setLoading(false); return }
    const load = async () => {
      try {
        const r = await fetch(`${SB_URL}/functions/v1/ssl-health`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'public_status', username }),
        })
        const d = await r.json()
        if (d.ok) setData(d)
        else setError(d.error || 'Not found')
      } catch (e) { setError(e.message) }
      setLoading(false)
    }
    load()
  }, [username])

  const scores = data?.scores || []
  const allHealthy = scores.length > 0 && scores.every(s => s.cert_valid && (s.expiry_days == null || s.expiry_days > 30))
  const hasIssues  = scores.some(s => !s.cert_valid || (s.expiry_days != null && s.expiry_days <= 30))

  const overallColor  = allHealthy ? '#16a34a' : hasIssues ? '#dc2626' : '#d97706'
  const overallBg     = allHealthy ? '#f0fdf4'  : hasIssues ? '#fef2f2' : '#fffbeb'
  const overallLabel  = allHealthy ? 'All systems operational' : hasIssues ? 'Issues detected' : 'Monitoring'
  const OverallIcon   = allHealthy ? CheckCircle : hasIssues ? XCircle : AlertTriangle

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e2e8f0',
        padding: '0 24px', height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => nav && nav('/')}>
          <Shield size={18} color="#10b981" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a' }}>SSLVault</span>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          Powered by <a href="https://easysecurity.in" target="_blank" rel="noreferrer"
            style={{ color: '#10b981', textDecoration: 'none' }}>easysecurity.in</a>
        </span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <RefreshCw size={24} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            Loading status…
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <XCircle size={32} style={{ color: '#dc2626', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: '#0a0a0a', marginBottom: 6 }}>{error}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>This status page may not be public or doesn't exist.</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#0a0a0a' }}>
                    {data?.display_name || username}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>SSL status page</div>
                </div>
              </div>

              {/* Overall status banner */}
              <div style={{ background: overallBg, border: `0.5px solid ${overallColor}33`,
                borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <OverallIcon size={18} color={overallColor} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: overallColor }}>{overallLabel}</div>
                  <div style={{ fontSize: 12, color: overallColor + 'aa', marginTop: 1 }}>
                    {scores.length} domain{scores.length !== 1 ? 's' : ''} monitored
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                  Updated {scores.length > 0 ? timeAgo(scores[0].scanned_at) : '—'}
                </div>
              </div>
            </div>

            {/* Domain list */}
            {scores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: '#94a3b8' }}>
                No public domains to display.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scores.map(s => {
                  const gs = gradeStyle(s.grade)
                  const domainHealthy = s.cert_valid && (s.expiry_days == null || s.expiry_days > 30)
                  return (
                    <div key={s.domain} style={{ background: '#fff', border: `0.5px solid ${gs.border}`,
                      borderRadius: 10, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 14 }}>

                      {/* Status dot */}
                      <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        background: domainHealthy ? '#16a34a' : s.expiry_days != null && s.expiry_days <= 7 ? '#dc2626' : '#d97706',
                        boxShadow: domainHealthy ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none' }} />

                      {/* Domain */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s.domain}
                          <a href={`https://${s.domain}`} target="_blank" rel="noreferrer"
                            style={{ color: '#94a3b8', display: 'flex' }}
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: s.hsts ? '#16a34a' : '#dc2626' }}>
                            {s.hsts ? '✓' : '✗'} HSTS
                          </span>
                          <span style={{ fontSize: 11, color: s.caa ? '#16a34a' : '#dc2626' }}>
                            {s.caa ? '✓' : '✗'} CAA
                          </span>
                          {s.expiry_days != null && (
                            <span style={{ fontSize: 11, fontWeight: 500,
                              color: s.expiry_days <= 7 ? '#dc2626' : s.expiry_days <= 30 ? '#d97706' : '#16a34a' }}>
                              {s.expiry_days <= 0 ? 'Expired' : `${s.expiry_days}d until expiry`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grade */}
                      <div style={{ width: 40, height: 40, borderRadius: 9, background: gs.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${gs.border}`, flexShrink: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: gs.color, fontFamily: 'monospace' }}>
                          {s.grade || 'F'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href="https://easysecurity.in" target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Shield size={12} color="#10b981" />
                Secured & monitored by SSLVault · easysecurity.in
              </a>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
