// PublicStatus.jsx — Public shareable SSL status page at /status/:username
import { useState, useEffect } from 'react'
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

function gradeStyle(grade) {
  if (!grade || grade === 'F') return { color: '#f87171', bg: '#fef2f2', border: '#fecaca' }
  if (grade === 'D') return { color: '#ffffff', bg: 'rgba(239,68,68,0.08)', border: '#F2C4BC' }
  if (grade === 'C') return { color: '#ca8a04', bg: '#fefce8', border: '#fef08a' }
  if (grade === 'B') return { color: '#ffffff', bg: '#111111', border: '#A8E6DE' }
  if (grade === 'A') return { color: '#4ade80', bg: '#111111', border: '#A8E6DE' }
  if (grade === 'A+') return { color: '#ffffff', bg: '#111111', border: '#6ee7b7' }
  return { color: 'rgba(255,255,255,0.7)', bg: '#000000', border: '#ffffff' }
}

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

export default function PublicStatus({ username: propUsername, nav }) {
  const isMobile = useIsMobile()
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

  const overallColor  = allHealthy ? '#4ade80' : hasIssues ? '#f87171' : '#ffffff'
  const overallBg     = allHealthy ? '#111111'  : hasIssues ? '#fef2f2' : 'rgba(239,68,68,0.08)'
  const overallLabel  = allHealthy ? 'All systems operational' : hasIssues ? 'Issues detected' : 'Monitoring'
  const OverallIcon   = allHealthy ? CheckCircle : hasIssues ? XCircle : AlertTriangle

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #99f6e4',
        padding: '0 24px', height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => nav && nav('/')}>
          <Shield size={18} color="#0d9488" />
          <span style={{ fontSize:14, fontWeight: 600, color: '#ffffff' }}>SSLVault</span>
        </div>
        <span style={{ fontSize:11, color: 'rgba(255,255,255,0.38)' }}>
          Powered by <a href="https://easysecurity.in" target="_blank" rel="noreferrer"
            style={{ color: '#ffffff', textDecoration: 'none' }}>easysecurity.in</a>
        </span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding:'min(40px,5vw) min(24px,4vw)' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.38)' }}>
            <RefreshCw size={24} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            Loading status…
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <XCircle size={32} style={{ color: '#f87171', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize:15, fontWeight: 500, color: '#ffffff', marginBottom: 6 }}>{error}</div>
            <div style={{ fontSize:13, color: 'rgba(255,255,255,0.38)' }}>This status page may not be public or doesn't exist.</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight: 600, color: '#ffffff' }}>
                    {data?.display_name || username}
                  </div>
                  <div style={{ fontSize:12, color: 'rgba(255,255,255,0.38)' }}>SSL status page</div>
                </div>
              </div>

              {/* Overall status banner */}
              <div style={{ background: overallBg, border: `0.5px solid ${overallColor}33`,
                borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <OverallIcon size={18} color={overallColor} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize:14, fontWeight: 600, color: overallColor }}>{overallLabel}</div>
                  <div style={{ fontSize:12, color: overallColor + 'aa', marginTop: 1 }}>
                    {scores.length} domain{scores.length !== 1 ? 's' : ''} monitored
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize:11, color: 'rgba(255,255,255,0.38)' }}>
                  Updated {scores.length > 0 ? timeAgo(scores[0].scanned_at) : '—'}
                </div>
              </div>
            </div>

            {/* Domain list */}
            {scores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize:13, color: 'rgba(255,255,255,0.38)' }}>
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
                        background: domainHealthy ? '#4ade80' : s.expiry_days != null && s.expiry_days <= 7 ? '#f87171' : '#ffffff',
                        boxShadow: domainHealthy ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none' }} />

                      {/* Domain */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize:13, fontWeight: 500, color: '#ffffff',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
                          {s.domain}
                          <a href={`https://${s.domain}`} target="_blank" rel="noreferrer"
                            style={{ color: 'rgba(255,255,255,0.38)', display: 'flex' }}
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                          <span style={{ fontSize:11, color: s.hsts ? '#4ade80' : '#f87171' }}>
                            {s.hsts ? '✓' : '✗'} HSTS
                          </span>
                          <span style={{ fontSize:11, color: s.caa ? '#4ade80' : '#f87171' }}>
                            {s.caa ? '✓' : '✗'} CAA
                          </span>
                          {s.expiry_days != null && (
                            <span style={{ fontSize:11, fontWeight: 500,
                              color: s.expiry_days <= 7 ? '#f87171' : s.expiry_days <= 30 ? '#ffffff' : '#4ade80' }}>
                              {s.expiry_days <= 0 ? 'Expired' : `${s.expiry_days}d until expiry`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grade */}
                      <div style={{ width: 40, height: 40, borderRadius: 9, background: gs.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${gs.border}`, flexShrink: 0 }}>
                        <span style={{ fontSize:15, fontWeight: 700, color: gs.color, fontFamily: 'monospace' }}>
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
                style={{ fontSize:12, color: 'rgba(255,255,255,0.38)', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Shield size={12} color="#0d9488" />
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
