import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

export default function SLADashboard({ nav }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setError('Not logged in'); setLoading(false); return }
        const res = await fetch(SB_URL + '/functions/v1/sla-manage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token,
          },
          body: JSON.stringify({ action: 'get_status' }),
        })
        const json = await res.json()
        setData(json)
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="v2-page" style={{ padding: 40, color: '#f0ede8' }}>
        Loading SLA status...
      </div>
    )
  }

  if (error) {
    return (
      <div className="v2-page" style={{ padding: 40 }}>
        <div className="v2-alert v2-alert-error">Error: {error}</div>
      </div>
    )
  }

  if (!data || !data.has_sla) {
    return (
      <div className="v2-page" style={{ padding: 40, color: '#f0ede8', maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 16 }}>SLA Coverage</h2>
        <p style={{ color: 'rgba(240,237,232,0.6)', marginBottom: 20 }}>
          No active SLA subscription found. Upgrade to SSLVault Premium.
        </p>
        <button className="v2-btn v2-btn-primary" onClick={() => nav && nav('/pricing')}>
          View Premium plans
        </button>
      </div>
    )
  }

  var score = data.compliance_score || 0
  var certs = data.certs || []
  var sub = data.sub || {}

  return (
    <div className="v2-page" style={{ padding: '28px 20px', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: '#f0ede8', marginBottom: 8 }}>SLA Coverage</h2>
      <p style={{ color: 'rgba(240,237,232,0.5)', fontSize: 12, marginBottom: 24 }}>
        Plan: {sub.plan} - {sub.domain_limit} domains
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Compliance Score</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: score >= 80 ? '#4ade80' : score >= 50 ? '#f59e0b' : '#c0392b' }}>{score}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Total Certs</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f0ede8' }}>{data.total_certs || 0}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>SLA Status</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: score >= 80 ? '#4ade80' : '#f59e0b' }}>{data.sla_status || 'UNKNOWN'}</div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(192,57,43,0.08)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'rgba(240,237,232,0.4)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Domain</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'rgba(240,237,232,0.4)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Expires</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: 'rgba(240,237,232,0.4)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Days Left</th>
            </tr>
          </thead>
          <tbody>
            {certs.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: 'rgba(240,237,232,0.3)', fontSize: 13 }}>No active certificates</td>
              </tr>
            ) : certs.map(function(c) {
              var d = c.expires_at ? Math.floor((new Date(c.expires_at).getTime() - Date.now()) / 86400000) : 999
              var col = d < 10 ? '#c0392b' : d < 30 ? '#f59e0b' : '#4ade80'
              return (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(192,57,43,0.1)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#f0ede8', fontFamily: 'monospace' }}>{c.domain}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(240,237,232,0.5)' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB') : 'N/A'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: col }}>{Math.max(0, d)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
