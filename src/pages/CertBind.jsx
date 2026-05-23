// CertBind.jsx v4 — Simplified: "Is my cert live on my server?"
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Shield, Server, Globe } from 'lucide-react'

const SB = 'https://frthcwkntciaakqsppss.supabase.co'

async function callCertBind(action, extra = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${SB}/functions/v1/certbind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return res.json()
}

function statusConfig(status) {
  switch (status) {
    case 'bound':          return { icon: CheckCircle, color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', label: 'Live & Verified',    desc: 'Certificate is active on your server' }
    case 'key_mismatch':   return { icon: XCircle,     color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Key Mismatch',       desc: 'Wrong private key on server — reinstall needed' }
    case 'cert_mismatch':  return { icon: XCircle,     color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Wrong Certificate',  desc: 'Server is serving a different certificate' }
    case 'chain_anomaly':  return { icon: AlertCircle, color: '#8b5cf6', bg: '#faf5ff', border: '#ddd6fe', label: 'Chain Issue',        desc: 'Possible SSL inspection proxy detected' }
    case 'partial_deploy': return { icon: AlertCircle, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Partial Deploy',     desc: 'Some servers have the old certificate' }
    case 'unreachable':    return { icon: AlertCircle, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Unreachable',        desc: 'Could not connect to check' }
    case 'pending':        return { icon: Clock,        color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'Checking…',         desc: 'Verification in progress' }
    default:               return { icon: Clock,        color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'Not Checked',       desc: 'Click Run Check to verify' }
  }
}

function CertCard({ cert, onCheck, checking }) {
  const cfg = statusConfig(cert.certbind_status)
  const Icon = cfg.icon
  const hasAgent = !!cert.agent_id
  const checkedAt = cert.certbind_checked_at
    ? new Date(cert.certbind_checked_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
    : null
  const installMethod = cert.install_method

  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      overflow: 'hidden', transition: 'box-shadow .15s',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cert.domain}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {installMethod === 'agent' && <><Server size={10} /> VPS</>}
            {installMethod === 'cpanel' && <><Globe size={10} /> cPanel</>}
            {!installMethod && <><Shield size={10} /> Not installed</>}
            {checkedAt && <span>· {checkedAt}</span>}
          </div>
        </div>
        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 20,
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          fontSize: 11, fontWeight: 600, color: cfg.color,
          flexShrink: 0
        }}>
          <Icon size={12} />
          {cfg.label}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {cert.certbind_status
            ? cfg.desc
            : installMethod
              ? 'Run a check to verify the certificate is live on your server'
              : 'Install the certificate on a server first, then run a check'
          }
        </div>
        <button
          onClick={() => onCheck(cert)}
          disabled={checking === cert.id || !installMethod}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 7,
            background: installMethod ? '#10b981' : '#f3f4f6',
            color: installMethod ? '#fff' : '#9ca3af',
            border: 'none', fontWeight: 600, fontSize: 12,
            cursor: installMethod ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'background .15s',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={12} style={{ animation: checking === cert.id ? 'spin 1s linear infinite' : 'none' }} />
          {checking === cert.id ? 'Checking…' : 'Run check'}
        </button>
      </div>
    </div>
  )
}

export default function CertBind() {
  const [certs, setCerts] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(null) // cert.id being checked
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); load(user.id) }
    })
  }, [])

  async function load(uid) {
    setLoading(true)
    const [{ data: certsData }, { data: agentsData }] = await Promise.all([
      supabase.from('certificates')
        .select('id, domain, status, install_method, certbind_status, certbind_checked_at, ggs_order_id')
        .eq('user_id', uid).eq('status', 'active')
        .order('issued_at', { ascending: false }),
      supabase.from('persistent_agents')
        .select('id, nickname, hostname, status, last_seen_at')
        .eq('user_id', uid),
    ])
    // Deduplicate by domain — keep latest per domain
    const seen = new Set()
    const unique = (certsData || []).filter(c => { if (seen.has(c.domain)) return false; seen.add(c.domain); return true })
    // Attach agent_id from last successful job
    const { data: jobs } = await supabase.from('agent_jobs')
      .select('domain, agent_id').eq('user_id', uid).eq('status', 'success')
      .order('created_at', { ascending: false })
    const domainAgent = {}
    for (const j of (jobs || [])) { if (!domainAgent[j.domain]) domainAgent[j.domain] = j.agent_id }
    const enriched = unique.map(c => ({ ...c, agent_id: domainAgent[c.domain] || null }))
    setCerts(enriched)
    setAgents(agentsData || [])
    setLoading(false)
  }

  async function runCheck(cert) {
    if (!cert.install_method) return
    setChecking(cert.id)
    try {
      const agentId = cert.agent_id
      const d = await callCertBind('request_bind_check', {
        user_id: userId, cert_id: cert.id, agent_id: agentId || null
      })
      // Poll for result up to 30s
      if (d.check_id && agentId) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 3000))
          const { data: check } = await supabase.from('certbind_checks')
            .select('binding_status').eq('id', d.check_id).single()
          if (check && check.binding_status && check.binding_status !== 'pending') break
        }
      }
      await load(userId)
    } catch {}
    setChecking(null)
  }

  // Counts
  const verified = certs.filter(c => c.certbind_status === 'bound').length
  const issues   = certs.filter(c => ['key_mismatch','cert_mismatch','chain_anomaly','partial_deploy'].includes(c.certbind_status)).length
  const noAgent  = certs.filter(c => !c.install_method).length

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#9ca3af', fontFamily:'inherit' }}>
      <RefreshCw size={16} style={{ animation:'spin 1s linear infinite', marginRight:8 }} /> Loading…
    </div>
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px', fontFamily: "'Inter var','Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>
          Certificate Status
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          Is your certificate actually live on your server?
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { num: verified, label: 'Verified live', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
          { num: issues,   label: 'Need attention', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
          { num: noAgent,  label: 'Not installed',  color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
        ].map(({ num, label, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{num}</div>
            <div style={{ fontSize: 11, color, marginTop: 4, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Cert list */}
      {certs.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 24px', color:'#9ca3af', fontSize:13 }}>
          No active certificates yet. Issue your first certificate to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {certs.map(cert => (
            <CertCard key={cert.id} cert={cert} onCheck={runCheck} checking={checking} />
          ))}
        </div>
      )}

      {/* Agent status footer */}
      {agents.length > 0 && (
        <div style={{ marginTop: 24, padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={13} color="#6b7280" />
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {agents.filter(a => (Date.now() - new Date(a.last_seen_at).getTime()) < 12*60*1000).length} of {agents.length} agent{agents.length !== 1 ? 's' : ''} online
          </span>
        </div>
      )}
    </div>
  )
}
