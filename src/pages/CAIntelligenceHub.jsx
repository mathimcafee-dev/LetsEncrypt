// CAIntelligenceHub.jsx — Landing page for CA Intelligence
// Shows connected CAs as entry cards + cross-CA aggregate health strip
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Activity, AlertTriangle, ChevronRight, RefreshCw,
  CheckCircle, AlertCircle, Clock, TrendingUp, Zap, Lock, Globe
} from 'lucide-react'
import '../styles/design-v2.css'

function dLeft(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - Date.now()) / 86400000)
}

const CA_META = {
  digicert: {
    id: 'digicert',
    name: 'DigiCert',
    sub: 'CertCentral Services API',
    logo: 'DC',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    route: '/ca-intelligence/digicert',
    capabilities: [
      'Full portfolio with expiry risk map',
      'Org & domain validation status',
      'Reissue history & revoke workflow',
      'PQC / crypto agility scanner',
      'CT log history per certificate',
      'FQDN report export',
      '47-day readiness score',
    ],
  },
  sectigo: {
    id: 'sectigo',
    name: 'Sectigo',
    sub: 'SCM REST API',
    logo: 'SC',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    route: '/ca-intelligence/sectigo',
    capabilities: [
      'Full SSL/TLS certificate inventory',
      'Organisation & domain profiles',
      'Renewal & revocation workflow',
      'EV / OV approval status',
      'MSSL agreement tracking',
      'Certificate type breakdown',
    ],
  },
}

export default function CAIntelligenceHub({ nav }) {
  const [connections, setConnections] = useState([])
  const [certs,       setCerts]       = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const tok = session.access_token

      const [connRes, certRes] = await Promise.all([
        fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ action: 'list_connections' })
        }).then(r => r.json()),
        fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/ca-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ action: 'list_imported' })
        }).then(r => r.json()),
      ])

      if (connRes.ok) setConnections(connRes.connections || [])
      if (certRes.ok) setCerts(certRes.certs || [])
      setLoading(false)
    })
  }, [])

  const connectedCAs = Object.values(CA_META).map(ca => ({
    ...ca,
    conn: connections.find(c => c.ca_type === ca.id),
    certCount: certs.filter(c => (c.source || c.imported_from) === ca.id).length,
  }))

  const expiring30  = certs.filter(c => { const d = dLeft(c.expires_at); return d !== null && d <= 30 && d > 0 })
  const expiring7   = certs.filter(c => { const d = dLeft(c.expires_at); return d !== null && d <= 7  && d > 0 })
  const expired     = certs.filter(c => { const d = dLeft(c.expires_at); return d !== null && d <= 0 })

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth: 960 }}>

        {/* Header */}
        <div style={{ paddingTop: 8, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--v2-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={17} color="white" strokeWidth={2}/>
            </div>
            <div>
              <h1 className="v2-h1" style={{ fontSize: 22, letterSpacing: '-0.3px', margin: 0 }}>CA Intelligence</h1>
              <p style={{ fontSize: 12, color: 'var(--v2-text-3)', margin: 0, marginTop: 2 }}>
                Deep visibility into every CA portfolio — separate workspaces, no data mixing
              </p>
            </div>
          </div>
        </div>

        {/* Cross-CA health strip */}
        {!loading && certs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 28 }}>
            {[
              { val: certs.length,      label: 'Total certs tracked', color: 'var(--v2-text)',   icon: Shield },
              { val: connections.length, label: 'CAs connected',       color: 'var(--v2-green)',  icon: CheckCircle },
              { val: expiring30.length, label: 'Expiring in 30 days', color: '#d97706',           icon: Clock },
              { val: expiring7.length,  label: 'Expiring in 7 days',  color: '#ea580c',           icon: AlertTriangle },
              { val: expired.length,    label: 'Expired',             color: '#dc2626',           icon: AlertCircle },
            ].map(({ val, label, color, icon: Icon }) => (
              <div key={label} className="v2-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Icon size={13} strokeWidth={2} style={{ color }}/>
                  <span style={{ fontSize: 10, color: 'var(--v2-text-3)', fontWeight: 500,
                    textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'var(--v2-mono)',
                  letterSpacing: '-0.5px' }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Alert if issues */}
        {expired.length > 0 && (
          <div className="v2-callout error" style={{ marginBottom: 20 }}>
            <AlertCircle size={13} style={{ flexShrink: 0, color: '#dc2626' }}/>
            <span><strong>{expired.length} expired certificate{expired.length !== 1 ? 's' : ''}</strong> across your portfolio — {expired.map(c => c.domain).slice(0,3).join(', ')}{expired.length > 3 ? ` +${expired.length - 3} more` : ''}. Open the relevant CA workspace to take action.</span>
          </div>
        )}
        {expiring7.length > 0 && expired.length === 0 && (
          <div className="v2-callout warning" style={{ marginBottom: 20 }}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }}/>
            <span><strong>{expiring7.length} certificate{expiring7.length !== 1 ? 's' : ''}</strong> expiring within 7 days. Open the relevant CA workspace to reissue or revoke.</span>
          </div>
        )}

        {/* CA workspace cards */}
        <div className="v2-section-label" style={{ marginBottom: 12 }}>CA workspaces</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px,1fr))', gap: 14, marginBottom: 32 }}>
          {connectedCAs.map(ca => (
            <div key={ca.id} className="v2-card"
              style={{ overflow: 'hidden', cursor: 'pointer', transition: 'border-color .15s' }}
              onClick={() => nav(ca.route)}
              onMouseEnter={e => e.currentTarget.style.borderColor = ca.color + '66'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--v2-border)'}>

              {/* Card header */}
              <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--v2-border)',
                display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: ca.bg,
                  border: `1px solid ${ca.border}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 800, fontSize: 14, color: ca.color, flexShrink: 0 }}>
                  {ca.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--v2-text)', letterSpacing: '-0.2px' }}>
                    {ca.name} Intelligence
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--v2-text-3)', marginTop: 1 }}>{ca.sub}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {ca.conn ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                      background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #bbf7d0',
                      display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a',
                        display: 'inline-block' }}/>
                      Connected
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                      background: 'var(--v2-surface-3)', color: 'var(--v2-text-3)',
                      border: '0.5px solid var(--v2-border)' }}>
                      Not connected
                    </span>
                  )}
                  {ca.conn && ca.certCount > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--v2-text-3)' }}>{ca.certCount} certs</span>
                  )}
                </div>
              </div>

              {/* Capabilities list */}
              <div style={{ padding: '14px 18px 16px' }}>
                <div className="v2-section-label" style={{ marginBottom: 8 }}>Intelligence layers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {ca.capabilities.map(cap => (
                    <div key={cap} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: ca.color,
                        flexShrink: 0, opacity: 0.7 }}/>
                      <span style={{ fontSize: 12, color: 'var(--v2-text-2)', lineHeight: 1.5 }}>{cap}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
                  color: ca.color, fontSize: 12, fontWeight: 600 }}>
                  {ca.conn ? 'Open workspace' : 'Connect to get started'}
                  <ChevronRight size={13} strokeWidth={2.5}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* What is CA Intelligence */}
        <div className="v2-card v2-card-pad" style={{ background: 'var(--v2-surface-2)' }}>
          <div className="v2-section-label" style={{ marginBottom: 10 }}>About CA Intelligence</div>
          <p style={{ fontSize: 13, color: 'var(--v2-text-2)', lineHeight: 1.75, margin: 0 }}>
            CA Intelligence gives you deep visibility into certificates you already manage at DigiCert, Sectigo, or other CAs —
            beyond what basic monitoring provides. Each CA workspace is isolated so data from one CA never bleeds into another.
            Connect your CertCentral API key to unlock expiry risk maps, org/domain validation tracking, PQC readiness scoring,
            reissue workflows, and more — all from SSLVault without logging into each CA portal separately.
          </p>
        </div>

      </div>
    </div>
  )
}
