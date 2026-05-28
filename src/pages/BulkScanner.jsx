// BulkScanner.jsx — Public page. Paste up to 100 domains, get SSL health grades instantly.
import { useState } from 'react'
import { Scan, RefreshCw, CheckCircle, XCircle, AlertTriangle, Download, X, Shield } from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

async function bulkScan(domains) {
  const r = await fetch(`${SB_URL}/functions/v1/ssl-health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bulk_scan', domains }),
  })
  return r.json()
}

function gradeStyle(grade) {
  if (!grade || grade === 'F') return { color: '#f87171', bg: 'rgba(192,57,43,0.12)' }
  if (grade === 'D') return { color: '#ffffff', bg: 'rgba(239,68,68,0.08)' }
  if (grade === 'C') return { color: '#e67e22', bg: 'rgba(230,126,34,0.08)' }
  if (grade === 'B') return { color: 'var(--v2-green-text)', bg: 'var(--v2-green-bg)' }
  if (grade === 'A') return { color: '#4ade80', bg: 'transparent' }
  if (grade === 'A+') return { color: '#ffffff', bg: 'transparent' }
  return { color: '#b0a8a0', bg: 'var(--v2-bg)' }
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function Tick({ ok }) {
  return ok
    ? <CheckCircle size={12} color="#16a34a" style={{ flexShrink: 0 }} />
    : <XCircle size={12} color="#c0392b" style={{ flexShrink: 0 }} />
}

function exportCSV(results) {
  const header = 'Domain,Grade,Score,TLS Valid,HSTS,CAA,Expiry Days,Issuer,Error'
  const rows = results.map(r =>
    [r.domain, r.grade, r.score, r.cert_valid, r.hsts, r.caa,
      r.expiry_days ?? '', r.issuer ?? '', r.error ?? ''].join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `ssl-scan-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function BulkScanner({ nav }) {
  const isMobile = useIsMobile()
  const [input,    setInput]    = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results,  setResults]  = useState(null)
  const [error,    setError]    = useState('')

  const doScan = async () => {
    const lines = input.split('\n').map(l => l.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean)
    const unique = [...new Set(lines)].slice(0, 100)
    if (!unique.length) { setError('Enter at least one domain.'); return }

    setScanning(true); setError(''); setResults(null); setProgress(0)

    // Simulate progress during scan
    const iv = setInterval(() => setProgress(p => Math.min(90, p + Math.random() * 8)), 400)

    try {
      const d = await bulkScan(unique)
      clearInterval(iv); setProgress(100)
      if (d.ok) setResults(d.results)
      else setError(d.error || 'Scan failed')
    } catch (e) {
      clearInterval(iv)
      setError(e.message || 'Scan failed')
    }
    setScanning(false)
  }

  const grades = results ? results.reduce((a, r) => { a[r.grade] = (a[r.grade]||0)+1; return a }, {}) : {}
  const avgScore = results?.length ? Math.round(results.reduce((a, r) => a + (r.score||0), 0) / results.length) : 0

  return (
    <div className="v2-page">
      {/* Nav bar */}
      <div style={{ background: 'var(--v2-surface)', borderBottom: '0.5px solid var(--v2-border)',
        padding: '0 24px', height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => nav && nav('/')}>
          <Shield size={18} color="#c0392b" />
          <span style={{ fontSize:14, fontWeight: 600, color: '#ffffff' }}>SSLVault</span>
          <span style={{ fontSize:11, color: '#b0a8a0', fontWeight: 400 }}>· Bulk Scanner</span>
        </div>
        <button onClick={() => nav && nav('/auth')}
          style={{ fontSize:12, padding: '6px 14px', borderRadius: 7,
            border: '0.5px solid var(--v2-border)', background: 'var(--v2-surface)',
            color: '#e8e0d8', cursor: 'pointer' }}>
          Sign in
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px' }}>
            <Scan size={22} color="#16a34a" />
          </div>
          <h1 style={{ fontSize:26, fontWeight: 600, color: '#ffffff', margin: '0 0 8px',
            letterSpacing: '-0.4px' }}>Bulk SSL scanner</h1>
          <p style={{ fontSize:14, color: '#b0a8a0', margin: 0 }}>
            Paste up to 100 domains — get instant SSL grades, expiry, HSTS and CAA checks. No account needed.
          </p>
        </div>

        {/* Input */}
        <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', borderRadius: 'var(--v2-r-lg)', padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize:12, fontWeight: 500, color: '#e8e0d8' }}>
              Domains — one per line
            </label>
            {input && (
              <button onClick={() => { setInput(''); setResults(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a8a0', padding: 0, display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'easysecurity.in\ngoogle.com\ngithub.com\n...up to 100 domains'}
            rows={6}
            style={{ width: '100%', fontSize:13, fontFamily: 'monospace', resize: 'vertical',
              border: '0.5px solid var(--v2-border)', borderRadius: 8, padding: '10px 12px',
              color: '#ffffff', background:'rgba(255,255,255,0.03)', boxSizing: 'border-box', outline: 'none' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize:11, color: '#b0a8a0' }}>
              {input.split('\n').filter(l => l.trim()).length} domain{input.split('\n').filter(l=>l.trim()).length !== 1 ? 's' : ''} entered
            </span>
            <button onClick={doScan} disabled={scanning || !input.trim()}
              style={{ fontSize:13, fontWeight: 500, padding: '9px 20px', borderRadius: 8,
                background: scanning || !input.trim() ? 'var(--v2-border)' : '#f0ede8',
                color: scanning || !input.trim() ? 'var(--v2-text-3)' : 'var(--v2-surface)',
                border: 'none', cursor: scanning || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7, transition: 'background .15s' }}>
              {scanning
                ? <><RefreshCw size={13} style={{ animation: 'spin .8s linear infinite' }} /> Scanning…</>
                : <><Scan size={13} /> Scan all</>}
            </button>
          </div>

          {/* Progress bar */}
          {scanning && (
            <div style={{ marginTop: 12, height: 3, background: 'var(--v2-border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background:'#0d0000', borderRadius: 2,
                width: `${progress}%`, transition: 'width .4s ease' }} />
            </div>
          )}
          {error && <div style={{ fontSize:12, color: '#f87171', marginTop: 8 }}>{error}</div>}
        </div>

        {/* Results */}
        {results && (
          <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Scanned', val: results.length, color: '#e8e0d8' },
                { label: 'Avg score', val: avgScore, color: avgScore >= 80 ? '#4ade80' : avgScore >= 60 ? '#f0ede8' : '#f87171' },
                { label: 'A / A+', val: (grades['A']||0)+(grades['A+']||0), color: '#4ade80' },
                { label: 'F / issues', val: (grades['F']||0), color: '#f87171' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
                  borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ fontSize:20, fontWeight: 600, color, fontFamily: 'monospace' }}>{val}</div>
                  <div style={{ fontSize:11, color: '#b0a8a0', marginTop: 2 }}>{label}</div>
                </div>
              ))}
              <div style={{ background: 'var(--v2-surface)', border: '0.5px solid var(--v2-border)',
                borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center' }}>
                <button onClick={() => exportCSV(results)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ffffff', fontSize:12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-border)', borderRadius: 'var(--v2-r-lg)', overflow: 'hidden' }}>
              {/* Head */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 60px 52px 52px 52px 70px',
                padding: '8px 14px', background:'rgba(255,255,255,0.03)',
                borderBottom: '0.5px solid var(--v2-border)' }}>
                {['Domain', 'Grade', 'Score', 'TLS', 'HSTS', 'CAA', 'Expiry'].map(h => (
                  <div key={h} style={{ fontSize:10, fontWeight: 600, color: '#b0a8a0',
                    letterSpacing: '0.3px', textTransform: 'uppercase' }}>{h}</div>
                ))}
              </div>
              {results.map((r, i) => {
                const gs = gradeStyle(r.grade)
                const isLast = i === results.length - 1
                return (
                  <div key={r.domain} style={{ display: 'grid',
                    gridTemplateColumns: '1fr 52px 60px 52px 52px 52px 70px',
                    padding: '10px 14px', alignItems: 'center',
                    borderBottom: isLast ? 'none' : '0.5px solid var(--v2-border)' }}>
                    <div style={{ fontSize:12, color: '#ffffff', fontWeight: 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.domain}
                      {r.error && (
                        <div style={{ fontSize:10, color: '#f87171', fontWeight: 400, marginTop: 1 }}>
                          {r.error.slice(0, 50)}
                        </div>
                      )}
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 7, background: gs.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize:13, fontWeight: 700, color: gs.color, fontFamily: 'monospace' }}>
                        {r.grade || 'F'}
                      </span>
                    </div>
                    <div style={{ fontSize:11, fontWeight: 500, color: gs.color, fontFamily: 'monospace' }}>
                      {Math.round(r.score || 0)}/100
                    </div>
                    <Tick ok={r.cert_valid} />
                    <Tick ok={r.hsts} />
                    <Tick ok={r.caa} />
                    <div style={{ fontSize:11, fontWeight: 500,
                      color: r.expiry_days == null ? 'var(--v2-text-3)'
                           : r.expiry_days <= 7 ? '#f87171'
                           : r.expiry_days <= 30 ? '#f0ede8' : '#4ade80' }}>
                      {r.expiry_days != null ? (r.expiry_days <= 0 ? 'Expired' : `${r.expiry_days}d`) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize:11, color: '#b0a8a0', textAlign: 'center', marginTop: 12 }}>
              Grades: A+ (90–100) · A (80–89) · B (70–79) · C (60–69) · D (50–59) · F (&lt;50 or unreachable)
            </p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
