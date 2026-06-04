// SSLHealthScore.jsx — Grade A-F per domain · HSTS · CAA · Expiry · Cert validity
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import PageHero from '../components/PageHero'
import {
  Trophy, RefreshCw, Shield, ShieldOff, AlertTriangle,
  CheckCircle, XCircle, Clock, Globe, Plus, X, ChevronDown, ChevronUp
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

async function callHealth(tok, body) {
  const r = await fetch(`${SB_URL}/functions/v1/ssl-health`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  })
  return r.json()
}

function timeAgo(iso) {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Grade colour map
function gradeStyle(grade) {
  if (!grade || grade === 'F') return { color: '#0077b6', bg: 'rgba(0,119,182,0.09)', border: 'rgba(0,0,0,0.1)' }
  if (grade === 'D') return { color: '#111111', bg: 'rgba(239,68,68,0.08)', border: 'rgba(0,0,0,0.1)' }
  if (grade === 'C') return { color: '#e67e22', bg: 'rgba(230,126,34,0.08)', border: 'rgba(230,126,34,0.2)' }
  if (grade === 'B') return { color: '#111111', bg: 'transparent', border: 'rgba(0,119,182,0.2)' }
  if (grade === 'A') return { color: '#00a550', bg: 'transparent', border: 'rgba(0,119,182,0.2)' }
  if (grade === 'A+') return { color: '#111111', bg: 'transparent', border: '#0077b6' }
  return { color: '#333333', bg: '#000000', border: '#111111' }
}

function useIsMobile(bp=768){const[m,setM]=useState(typeof window!=='undefined'?window.innerWidth<=bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<=bp);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[bp]);return m}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0))
  const color = pct >= 80 ? '#00a550' : pct >= 60 ? '#111111' : pct >= 50 ? '#111111' : '#0077b6'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--v2-border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width .6s' }} />
      </div>
      <span style={{ fontSize:11, fontWeight: 500, color, fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
        {Math.round(pct)}
      </span>
    </div>
  )
}

function Check({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {ok
        ? <CheckCircle size={11} color="#16a34a" />
        : <XCircle size={11} color="#0077b6" />}
      <span style={{ fontSize:11, color: ok ? '#00a550' : '#0077b6' }}>{label}</span>
    </div>
  )
}

function DomainRow({ score, onRescan, scanning }) {
  const [expanded, setExpanded] = useState(false)
  const gs = gradeStyle(score.grade)

  return (
    <div style={{ border: `0.5px solid ${gs.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        background:'rgba(0,0,0,0.02)', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}>

        {/* Grade badge */}
        <div style={{ width: 44, height: 44, borderRadius: 10, background: gs.bg, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${gs.border}` }}>
          <span style={{ fontSize:16, fontWeight: 700, color: gs.color, fontFamily: 'monospace' }}>
            {score.grade || 'F'}
          </span>
        </div>

        {/* Domain + score bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize:13, fontWeight: 500, color: '#111111',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {score.domain}
            </span>
            {!score.cert_valid && (
              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
                background: 'rgba(0,119,182,0.09)', color: '#0077b6' }}>UNREACHABLE</span>
            )}
          </div>
          <ScoreBar score={score.score} />
        </div>

        {/* Checks strip */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <Check ok={score.hsts} label="HSTS" />
          <Check ok={score.caa} label="CAA" />
          <Check ok={score.cert_valid} label="TLS" />
          {score.expiry_days != null && (
            <span style={{ fontSize:11, fontWeight: 500,
              color: score.expiry_days <= 7 ? '#0077b6' : score.expiry_days <= 30 ? '#111111' : '#00a550' }}>
              {score.expiry_days <= 0 ? 'Expired' : `${score.expiry_days}d`}
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={() => onRescan(score.domain)}
            disabled={scanning === score.domain}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={10} style={scanning === score.domain ? { animation: 'spin .8s linear infinite' } : {}} />
            Rescan
          </button>
        </div>
        <div style={{ color: '#888888' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '12px 14px', borderTop: `0.5px solid ${gs.border}`,
          background: 'var(--v2-surface-3)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10 }}>
          {[
            { label: 'Grade',         val: score.grade || 'F' },
            { label: 'Score',         val: `${Math.round(score.score || 0)} / 100` },
            { label: 'Issuer',        val: score.issuer || '—' },
            { label: 'Expiry',        val: score.expiry_days != null ? (score.expiry_days <= 0 ? 'Expired' : `${score.expiry_days} days`) : '—' },
            { label: 'TLS reachable', val: score.cert_valid ? 'Yes ✓' : 'No ✗' },
            { label: 'HSTS',          val: score.hsts ? 'Enabled ✓' : 'Missing ✗' },
            { label: 'CAA record',    val: score.caa ? 'Present ✓' : 'Missing ✗' },
            { label: 'Last scanned',  val: timeAgo(score.scanned_at) },
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize:10, color: '#888888', marginBottom: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
              <div style={{ fontSize:12, color: '#111111', fontWeight: 500 }}>{val}</div>
            </div>
          ))}
          {score.error && (
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize:10, color: '#0077b6', fontWeight: 500, marginBottom: 2 }}>Error</div>
              <div style={{ fontSize:11, color: '#0077b6', fontFamily: 'monospace' }}>{score.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SSLHealthScore({ user }) {
  const isMobile = useIsMobile()
  const [tok, setTok] = useState('')
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(null)
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const inputRef = useRef(null)

  const load = async (t) => {
    const token = t || tok
    if (!token) return
    const d = await callHealth(token, { action: 'list', user_id: user?.id })
    if (d.ok) setScores(d.scores || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setTok(session.access_token); load(session.access_token) }
      else setLoading(false)
    })
  }, [])

  const rescan = async (domain) => {
    setScanning(domain)
    await callHealth(tok, { action: 'scan', domain, user_id: user?.id })
    await load()
    setScanning(null)
  }

  const addDomain = async () => {
    const d = newDomain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!d) return
    setAdding(true); setAddError('')
    try {
      const res = await callHealth(tok, { action: 'scan', domain: d, user_id: user?.id })
      if (res.ok) { setNewDomain(''); await load() }
      else setAddError(res.error || 'Scan failed')
    } catch (e) { setAddError(e.message) }
    setAdding(false)
  }

  // Summary stats
  const gradeCount = scores.reduce((acc, s) => {
    acc[s.grade] = (acc[s.grade] || 0) + 1; return acc
  }, {})
  const avgScore = scores.length ? Math.round(scores.reduce((a, s) => a + (s.score || 0), 0) / scores.length) : 0
  const issues = scores.filter(s => !s.hsts || !s.caa || (s.expiry_days != null && s.expiry_days <= 30))

  return (
    <div className="v2-page">
      <PageHero
        eyebrow="SSLVault · Fleet Intelligence"
        title="SSL Health Score"
        subtitle="Grade A–F across TLS reachability, HSTS, CAA records and expiry. Scan your entire domain fleet instantly."
        stats={[{n:'A–F',l:'Grade scale'},{n:'HSTS',l:'Enforced check'},{n:'CAA',l:'DNS security'},{n:'TLS 1.3',l:'Protocol check'}]}
        tags={['TLS reachability','HSTS enforcement','CAA records','Expiry tracking','Grade A+','Auto-scan','CSV export']}
      />
      <div className="v2-container" style={{ maxWidth: 860, paddingTop:24 }}>

        {/* Summary cards */}
        {scores.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Domains', val: scores.length, color: '#111111' },
              { label: 'Avg score', val: avgScore, color: avgScore >= 80 ? '#00a550' : avgScore >= 60 ? '#111111' : '#0077b6' },
              { label: 'A / A+', val: (gradeCount['A'] || 0) + (gradeCount['A+'] || 0), color: '#00a550' },
              { label: 'Need attention', val: issues.length, color: issues.length > 0 ? '#0077b6' : '#00a550' },
            ].map(({ label, val, color }) => (
              <div key={label} className="v2-card" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize:24, fontWeight: 500, color, fontFamily: 'monospace' }}>{val}</div>
                <div style={{ fontSize:11, color: '#888888', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Add domain */}
        <div className="v2-card" style={{ padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Globe size={14} color="var(--v2-text-3)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={newDomain}
              onChange={e => setNewDomain(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDomain()}
              placeholder="yourdomain.com — press Enter to scan"
              style={{ flex: 1, fontSize:13 }}
            />
            <button style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 11px',borderRadius:6,border:'1px solid rgba(0,0,0,0.15)',background:'#ffffff',color:'#444444',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}} onClick={addDomain} disabled={adding || !newDomain.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {adding
                ? <><RefreshCw size={10} style={{ animation: 'spin .8s linear infinite' }} /> Scanning…</>
                : <><Plus size={10} /> Scan domain</>}
            </button>
          </div>
          {addError && <div style={{ fontSize:11, color: '#0077b6', marginTop: 6 }}>{addError}</div>}
        </div>

        {/* Domain list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#888888' }}>
            <RefreshCw size={24} style={{ animation: 'spin .8s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            Loading scores…
          </div>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Trophy size={32} style={{ color: '#888888', margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontSize:14, fontWeight: 500, color: '#333333', marginBottom: 6 }}>
              No domains scanned yet
            </div>
            <div style={{ fontSize:12, color: '#888888' }}>
              Enter a domain above to get your first SSL health grade.
            </div>
          </div>
        ) : (
          <div>
            {scores.map(s => (
              <DomainRow key={s.id} score={s} onRescan={rescan} scanning={scanning} />
            ))}
            <div style={{ fontSize:11, color: '#888888', textAlign: 'center', marginTop: 8 }}>
              Grading: A+ (90–100) · A (80–89) · B (70–79) · C (60–69) · D (50–59) · F (&lt;50)
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
