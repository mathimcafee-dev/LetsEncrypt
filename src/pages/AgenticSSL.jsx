// AgenticSSL.jsx — One-click certificate issuance + install
// TEST VERSION — completely isolated from BuyCertificate flow
//
// What this page does:
//   1. Reads domain_profiles, dns_credentials, server_credentials, persistent_agents
//   2. Builds dropdown of domains that have dns_credentials (can auto-DCV)
//   3. Prefills contact + install target from existing data
//   4. Calls gogetssl-issue → place_order (IDENTICAL call to BuyCertificate)
//   5. Watches ssl_orders + certificates via Supabase Realtime for live progress
//
// What this page does NOT do:
//   - Touch any locked edge function
//   - Call dns-provider (place_order does autoDns() internally)
//   - Write install_method/install_server_id (dispatchInstall auto-detects from server_credentials)
//   - Modify BuyCertificate or any existing page
//
// ROLLBACK: delete this file + remove 4 lines from CLMHome → instant revert

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Zap, Shield, Globe, Server, User, Check, X,
  RefreshCw, AlertTriangle, ChevronDown, Info,
  CheckCircle, Clock, Wifi
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const GGS_FN = `${SB_URL}/functions/v1/gogetssl-issue`

// ── Helpers ───────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'

// ── Step config ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Order placed',        sub: 'GoGetSSL RapidSSL DV'           },
  { id: 2, label: 'DNS TXT added',       sub: 'Auto DCV challenge via API'     },
  { id: 3, label: 'DCV validated',       sub: 'GoGetSSL confirms ownership'    },
  { id: 4, label: 'Certificate installed', sub: 'Automatic install on server'  },
  { id: 5, label: 'Verified live',       sub: 'Cert active on your server'     },
]

// ── Step tracker UI ───────────────────────────────────────────────────
function StepTracker({ currentStep, failed, failedStep }) {
  return (
    <div style={{ padding:'16px 0' }}>
      {STEPS.map((step, idx) => {
        const done   = currentStep > step.id
        const active = currentStep === step.id && !failed
        const isFail = failed && failedStep === step.id
        const waiting = currentStep < step.id && !failed

        const dotColor = done ? '#4ade80' : isFail ? '#f87171' : active ? '#ff8c7a' : 'rgba(255,255,255,0.12)'
        const dotBorder = done ? '#4ade80' : isFail ? '#f87171' : active ? '#c0392b' : 'rgba(255,255,255,0.15)'

        return (
          <div key={step.id}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0,
                  background: dotColor === 'rgba(255,255,255,0.12)' ? 'rgba(255,255,255,0.04)' : `${dotColor}18`,
                  border:`2px solid ${dotBorder}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: active ? `0 0 0 4px rgba(192,57,43,0.2)` : 'none',
                  transition:'all 0.3s',
                }}>
                  {done   && <Check size={13} strokeWidth={3} color="#4ade80" />}
                  {isFail && <X size={12} strokeWidth={2.5} color="#f87171" />}
                  {active && <div style={{ width:8, height:8, borderRadius:'50%', background:'#ff8c7a',
                    animation:'ag-pulse 1s ease-in-out infinite' }} />}
                  {waiting && <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)' }}>{step.id}</span>}
                </div>
              </div>
              <div style={{ flex:1, paddingTop:4, paddingBottom: idx < STEPS.length-1 ? 16 : 0 }}>
                <div style={{
                  fontSize:12, fontWeight:600,
                  color: done ? '#4ade80' : isFail ? '#f87171' : active ? '#ffffff' : 'rgba(255,255,255,0.3)',
                  marginBottom:2,
                }}>
                  {step.label}
                  {active && <span style={{ marginLeft:8, fontSize:10, color:'#ff8c7a', fontWeight:400 }}>
                    running…
                  </span>}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{step.sub}</div>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                width:1.5, height:16, background: done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)',
                marginLeft:13, marginBottom:0, transition:'background 0.3s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Prefill check row ─────────────────────────────────────────────────
function CheckRow({ icon: Icon, label, detail, status }) {
  // status: 'ok' | 'warn' | 'missing'
  const colors = {
    ok:      { bg:'rgba(74,222,128,0.08)',  border:'rgba(74,222,128,0.2)',  icon:'#4ade80',  badge:'rgba(74,222,128,0.12)', badgeText:'#4ade80',  badgeLabel:'Auto' },
    warn:    { bg:'rgba(251,191,36,0.07)',  border:'rgba(251,191,36,0.2)',  icon:'#fbbf24',  badge:'rgba(251,191,36,0.12)', badgeText:'#fbbf24',  badgeLabel:'Manual install' },
    missing: { bg:'rgba(248,113,113,0.07)', border:'rgba(248,113,113,0.2)', icon:'#f87171',  badge:'rgba(248,113,113,0.12)', badgeText:'#f87171', badgeLabel:'Missing' },
  }
  const c = colors[status] || colors.ok
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
      borderRadius:8, border:`0.5px solid ${c.border}`, background:c.bg, marginBottom:8,
    }}>
      <div style={{
        width:30, height:30, borderRadius:7, flexShrink:0,
        background:`${c.icon}18`, border:`0.5px solid ${c.icon}30`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Icon size={15} color={c.icon} strokeWidth={1.8} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#ffffff', marginBottom:1 }}>{label}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{detail}</div>
      </div>
      <span style={{
        fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:4,
        background:c.badge, color:c.badgeText,
        border:`0.5px solid ${c.icon}30`, textTransform:'uppercase', letterSpacing:'0.4px',
        flexShrink:0,
      }}>{c.badgeLabel}</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function AgenticSSL({ user }) {
  // ── Data loading ──────────────────────────────────────────────────
  const [profiles,   setProfiles]   = useState([]) // domain_profiles
  const [dnsCreds,   setDnsCreds]   = useState([]) // dns_credentials
  const [servers,    setServers]    = useState([]) // server_credentials
  const [agents,     setAgents]     = useState([]) // persistent_agents
  const [loading,    setLoading]    = useState(true)

  // ── Domain selection + prefill ───────────────────────────────────
  const [selectedDomain, setSelectedDomain] = useState('')
  const [prefill,        setPrefill]        = useState(null)
  // prefill = { profile, dnsProvider, installMethod, installLabel, installTarget }

  // ── Pipeline state ───────────────────────────────────────────────
  const [phase, setPhase] = useState('select')
  // phases: select | running | done | failed

  const [currentStep,  setCurrentStep]  = useState(0)
  const [failedStep,   setFailedStep]   = useState(null)
  const [failedReason, setFailedReason] = useState('')
  const [orderId,      setOrderId]      = useState(null)  // ssl_orders.id
  const [ggsOrderId,   setGgsOrderId]   = useState(null)  // ssl_orders.ggs_order_id
  const [certResult,   setCertResult]   = useState(null)  // final cert data

  // Realtime channels
  const orderChannelRef = useRef(null)
  const certChannelRef  = useRef(null)

  // ── Load all prefill data ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [
        { data: profileData },
        { data: dnsData },
        { data: serverData },
        { data: agentData },
      ] = await Promise.all([
        supabase.from('domain_profiles').select('domain,first_name,last_name,email,phone').eq('user_id', user.id),
        supabase.from('dns_credentials').select('id,provider,label,domain_pattern').eq('user_id', user.id),
        supabase.from('server_credentials').select('id,nickname,server_type,domains,agent_id').eq('user_id', user.id),
        supabase.from('persistent_agents').select('id,nickname,status,last_seen_at').eq('user_id', user.id),
      ])
      setProfiles(profileData || [])
      setDnsCreds(dnsData || [])
      setServers(serverData || [])
      setAgents(agentData || [])
    } catch(e) { console.error('[AgenticSSL] loadData:', e) }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  // ── Domains eligible for Agentic SSL ─────────────────────────────
  // Must have: domain_profile + dns_credentials matching that domain
  const eligibleDomains = profiles.filter(p => {
    const apex = p.domain.split('.').slice(-2).join('.')
    return dnsCreds.some(c => {
      const cp = (c.domain_pattern || '').toLowerCase()
      return cp === p.domain.toLowerCase() || cp === apex || cp === `*.${apex}`
    })
  })

  // ── Build prefill when domain selected ───────────────────────────
  useEffect(() => {
    if (!selectedDomain) { setPrefill(null); return }
    const profile = profiles.find(p => p.domain === selectedDomain)
    if (!profile) { setPrefill(null); return }

    // DNS provider
    const apex = selectedDomain.split('.').slice(-2).join('.')
    const dnsCred = dnsCreds.find(c => {
      const cp = (c.domain_pattern || '').toLowerCase()
      return cp === selectedDomain.toLowerCase() || cp === apex || cp === `*.${apex}`
    })

    // Install target — match server_credentials.domains includes selectedDomain
    const serverMatch = servers.find(s =>
      Array.isArray(s.domains) && s.domains.includes(selectedDomain)
    )

    let installMethod = null
    let installLabel  = null

    if (serverMatch) {
      if (serverMatch.server_type === 'cpanel' || serverMatch.server_type === 'shared') {
        installMethod = 'cpanel'
        installLabel  = `cPanel · ${serverMatch.nickname}`
      } else if (serverMatch.agent_id) {
        const agent = agents.find(a => a.id === serverMatch.agent_id)
        const agentOnline = agent?.last_seen_at
          ? (Date.now() - new Date(agent.last_seen_at).getTime()) < 15 * 60 * 1000
          : false
        installMethod = 'agent'
        installLabel  = `Agent · ${agent?.nickname || serverMatch.nickname}${agentOnline ? ' · online' : ' · offline'}`
      } else {
        installMethod = 'server'
        installLabel  = serverMatch.nickname
      }
    } else {
      // Check persistent agents fallback
      const onlineAgent = agents.find(a => {
        if (!a.last_seen_at) return false
        return (Date.now() - new Date(a.last_seen_at).getTime()) < 15 * 60 * 1000
      })
      if (onlineAgent) {
        installMethod = 'agent'
        installLabel  = `Agent · ${onlineAgent.nickname} · online`
      }
    }

    setPrefill({ profile, dnsCred, installMethod, installLabel })
  }, [selectedDomain, profiles, dnsCreds, servers, agents])

  // ── Realtime: watch ssl_orders for status changes ─────────────────
  const subscribeToOrder = useCallback((ordId, ggsId) => {
    // Clean up any existing subscriptions first
    if (orderChannelRef.current) {
      supabase.removeChannel(orderChannelRef.current)
    }
    if (certChannelRef.current) {
      supabase.removeChannel(certChannelRef.current)
    }

    // Watch ssl_orders row
    orderChannelRef.current = supabase
      .channel(`agentic-order-${ordId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'ssl_orders',
        filter: `id=eq.${ordId}`
      }, (payload) => {
        const row = payload.new
        console.log('[AgenticSSL] ssl_orders update:', row.status, row.ggs_status)
        if (row.dcv_txt_value) {
          // DNS TXT was populated → step 2 done
          setCurrentStep(s => Math.max(s, 2))
        }
        if (row.status === 'active') {
          // GGS validated → step 3 done
          setCurrentStep(s => Math.max(s, 3))
        }
      })
      .subscribe()

    // Watch certificates row (created when cert activates)
    certChannelRef.current = supabase
      .channel(`agentic-cert-${ggsId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'certificates',
        filter: `ggs_order_id=eq.${ggsId}`
      }, (payload) => {
        const row = payload.new
        console.log('[AgenticSSL] certificates update:', row.status, row.install_status, row.is_live_on_server)
        if (row.status === 'active') {
          setCurrentStep(s => Math.max(s, 3))
        }
        if (row.install_status === 'installing' || row.install_status === 'installed') {
          setCurrentStep(s => Math.max(s, 4))
        }
        if (row.is_live_on_server === true) {
          setCurrentStep(5)
          setCertResult({
            domain:      row.domain,
            expires_at:  row.expires_at,
            install_method: row.install_method,
            is_live:     true,
          })
          setTimeout(() => setPhase('done'), 600)
        }
      })
      .subscribe()
  }, [])

  // ── Poll fallback: for DCV step (crons run every 5 min) ──────────
  // Realtime won't catch cron updates if the client was disconnected.
  // Simple poll every 30s as safety net.
  const pollRef = useRef(null)

  const startPoll = useCallback((ordId, ggsId) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        // Check ssl_orders
        const { data: order } = await supabase
          .from('ssl_orders')
          .select('status,dcv_txt_value,dcv_txt_name')
          .eq('id', ordId)
          .single()

        if (order?.dcv_txt_value) setCurrentStep(s => Math.max(s, 2))
        if (order?.status === 'active') setCurrentStep(s => Math.max(s, 3))

        // Check certificate
        const { data: cert } = await supabase
          .from('certificates')
          .select('status,install_status,is_live_on_server,domain,expires_at,install_method')
          .eq('ggs_order_id', ggsId)
          .eq('user_id', user?.id)
          .maybeSingle()

        if (cert?.status === 'active') setCurrentStep(s => Math.max(s, 3))
        if (cert?.install_status === 'installing' || cert?.install_status === 'installed') {
          setCurrentStep(s => Math.max(s, 4))
        }
        if (cert?.is_live_on_server === true) {
          setCurrentStep(5)
          setCertResult({
            domain:         cert.domain,
            expires_at:     cert.expires_at,
            install_method: cert.install_method,
            is_live:        true,
          })
          clearInterval(pollRef.current)
          setTimeout(() => setPhase('done'), 600)
        }
      } catch(e) { console.warn('[AgenticSSL] poll error:', e) }
    }, 30000) // every 30s
  }, [user?.id])

  // ── Cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current)
      if (certChannelRef.current)  supabase.removeChannel(certChannelRef.current)
      if (pollRef.current)         clearInterval(pollRef.current)
    }
  }, [])

  // ── THE MAIN ACTION ───────────────────────────────────────────────
  const handleIssueAndInstall = async () => {
    if (!prefill || !selectedDomain) return
    const { profile, dnsCred } = prefill

    // Validate
    if (!profile.first_name || !profile.last_name || !profile.email || !profile.phone) {
      alert('Domain profile is incomplete. Please update it in DNS Providers > domain profile.')
      return
    }

    setPhase('running')
    setCurrentStep(1)
    setFailedStep(null)
    setFailedReason('')

    try {
      // Get user JWT for the call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Call place_order — IDENTICAL to BuyCertificate
      const res = await fetch(GGS_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action:      'place_order',
          domain:      selectedDomain,
          period:      12,
          product_code: 'rapidssl',
          firstName:   profile.first_name,
          lastName:    profile.last_name,
          adminEmail:  profile.email,
          phone:       profile.phone,
        }),
      })

      const data = await res.json()

      if (!data.ok && !data.order_id) {
        // place_order failed
        setPhase('failed')
        setFailedStep(1)
        setFailedReason(data.error || 'Order placement failed — GoGetSSL rejected the request')
        return
      }

      // Step 1 done — order placed
      setCurrentStep(2)
      setOrderId(data.order_id)
      setGgsOrderId(data.ggs_order_id)

      // If DNS was added immediately, step 2 already done
      if (data.dcv_txt_value) {
        setCurrentStep(2) // step 2 = dns added (already happened inside place_order)
        console.log('[AgenticSSL] DNS TXT added by place_order:', data.dcv_txt_name)
      }

      // Subscribe to Realtime + start poll fallback
      subscribeToOrder(data.order_id, data.ggs_order_id)
      startPoll(data.order_id, data.ggs_order_id)

      // Move to step 3 indicator (awaiting DCV)
      setCurrentStep(s => Math.max(s, data.dcv_txt_value ? 2 : 1))

    } catch(e) {
      console.error('[AgenticSSL] handleIssueAndInstall error:', e)
      setPhase('failed')
      setFailedStep(1)
      setFailedReason(e.message || 'Unexpected error during order placement')
    }
  }

  // ── Reset to select ───────────────────────────────────────────────
  const handleReset = () => {
    if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current)
    if (certChannelRef.current)  supabase.removeChannel(certChannelRef.current)
    if (pollRef.current)         clearInterval(pollRef.current)
    setPhase('select')
    setCurrentStep(0)
    setFailedStep(null)
    setFailedReason('')
    setOrderId(null)
    setGgsOrderId(null)
    setCertResult(null)
    setSelectedDomain('')
    setPrefill(null)
  }

  // ── Readiness: all 3 checks green? ───────────────────────────────
  const isReady = prefill && prefill.profile && prefill.dnsCred && prefill.installMethod

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="v2-page" style={{ padding:'24px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
        <div style={{
          width:36, height:36, borderRadius:8, flexShrink:0,
          background:'rgba(192,57,43,0.2)', border:'1px solid rgba(192,57,43,0.4)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Zap size={18} strokeWidth={2} color="#ff8c7a" />
        </div>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h1 className="v2-h1" style={{ marginBottom:0 }}>Agentic SSL</h1>
            <span style={{
              fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:3,
              background:'rgba(192,57,43,0.2)', color:'#ff8c7a',
              border:'0.5px solid rgba(192,57,43,0.3)', textTransform:'uppercase', letterSpacing:'0.5px',
            }}>Beta</span>
          </div>
          <p style={{ margin:0, fontSize:11, color:'#b0a8a0' }}>
            Select a domain. One click. Certificate issued and installed.
          </p>
        </div>
      </div>

      {/* ── PHASE: SELECT ── */}
      {phase === 'select' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:900, marginTop:20 }}>

          {/* Left: domain selector + prefill */}
          <div>
            {/* Domain dropdown */}
            <div style={{
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:10, padding:16, marginBottom:12,
            }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                Select domain
              </div>
              {loading ? (
                <div style={{ fontSize:12, color:'#b0a8a0' }}>Loading your domains…</div>
              ) : eligibleDomains.length === 0 ? (
                <div style={{ padding:'12px', background:'rgba(251,191,36,0.07)',
                  border:'0.5px solid rgba(251,191,36,0.2)', borderRadius:7 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#fbbf24', marginBottom:4 }}>
                    No eligible domains
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
                    Agentic SSL requires a domain profile + DNS provider credentials.
                    Add both in <span style={{ color:'#ff8c7a' }}>DNS Providers</span>.
                  </div>
                </div>
              ) : (
                <div style={{ position:'relative' }}>
                  <select
                    value={selectedDomain}
                    onChange={e => setSelectedDomain(e.target.value)}
                    style={{
                      width:'100%', padding:'10px 36px 10px 12px',
                      fontSize:13, fontWeight:500, fontFamily:'monospace',
                      appearance:'none', cursor:'pointer',
                    }}
                  >
                    <option value="">— choose a domain —</option>
                    {eligibleDomains.map(p => (
                      <option key={p.domain} value={p.domain}>{p.domain}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} color="#b0a8a0" style={{
                    position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none',
                  }} />
                </div>
              )}
            </div>

            {/* Prefill checks */}
            {prefill && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                  textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                  Configuration prefilled
                </div>
                <CheckRow
                  icon={User} label="Contact details"
                  detail={`${prefill.profile.first_name} ${prefill.profile.last_name} · ${prefill.profile.email}`}
                  status="ok"
                />
                <CheckRow
                  icon={Globe} label="DNS provider"
                  detail={`${prefill.dnsCred?.provider || '?'} · ${prefill.dnsCred?.domain_pattern || selectedDomain}`}
                  status={prefill.dnsCred ? 'ok' : 'missing'}
                />
                <CheckRow
                  icon={Server} label="Install target"
                  detail={prefill.installLabel || 'No server configured for this domain'}
                  status={prefill.installMethod ? (prefill.installMethod === 'agent' || prefill.installMethod === 'cpanel' ? 'ok' : 'warn') : 'warn'}
                />
              </div>
            )}

            {/* Info note */}
            {prefill && !prefill.installMethod && (
              <div style={{
                display:'flex', gap:8, padding:'10px 12px', borderRadius:7,
                background:'rgba(251,191,36,0.07)', border:'0.5px solid rgba(251,191,36,0.2)',
                marginBottom:12,
              }}>
                <Info size={13} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                  No install target found for this domain. The cert will still be issued and stored.
                  You can install it manually from the dashboard.
                </div>
              </div>
            )}

            {/* Estimate */}
            {selectedDomain && prefill && (
              <div style={{
                display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
                background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.08)',
                borderRadius:7, marginBottom:16,
              }}>
                <Clock size={13} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  Estimated: <span style={{ color:'#ff8c7a', fontWeight:600 }}>3–8 minutes</span>
                  {' '}· No further action required
                </span>
              </div>
            )}

            {/* Issue button */}
            <button
              onClick={handleIssueAndInstall}
              disabled={!isReady || !selectedDomain}
              style={{
                width:'100%', padding:'13px', borderRadius:8, border:'none',
                fontSize:13, fontWeight:700, cursor: isReady && selectedDomain ? 'pointer' : 'not-allowed',
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                background: isReady && selectedDomain ? '#c0392b' : 'rgba(255,255,255,0.06)',
                color: isReady && selectedDomain ? '#ffffff' : 'rgba(255,255,255,0.25)',
                transition:'all 0.15s',
              }}
            >
              <Zap size={15} strokeWidth={2} />
              {!selectedDomain ? 'Select a domain first' : !isReady ? 'Setup incomplete' : 'Issue & Install'}
            </button>
          </div>

          {/* Right: pipeline preview */}
          <div style={{
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:10, padding:16,
          }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
              textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>
              What happens when you click
            </div>
            <StepTracker currentStep={0} failed={false} failedStep={null} />

            <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(255,255,255,0.03)',
              border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:7 }}>
              <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>
                Powered by existing infrastructure
              </div>
              {[
                'GoGetSSL RapidSSL DV — same CA as Issue cert',
                'Auto DNS via your connected provider',
                'Auto-install via cPanel or VPS agent',
                'Renewal calendar auto-scheduled',
              ].map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <Check size={10} strokeWidth={2.5} color="rgba(74,222,128,0.6)" />
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE: RUNNING ── */}
      {phase === 'running' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:900, marginTop:20 }}>
          <div style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:10, padding:20,
          }}>
            {/* Domain header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{
                width:32, height:32, borderRadius:7, background:'rgba(192,57,43,0.15)',
                border:'1px solid rgba(192,57,43,0.3)', display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Globe size={15} color="#ff8c7a" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', fontFamily:'monospace' }}>
                  {selectedDomain}
                </div>
                <div style={{ fontSize:10, color:'#b0a8a0' }}>GoGetSSL RapidSSL DV · 199 days</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.3)' }}>
                Step {Math.min(currentStep + 1, 5)} of 5
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2, marginBottom:6, overflow:'hidden' }}>
              <div style={{
                height:'100%', background:'#c0392b', borderRadius:2,
                width:`${Math.min((currentStep / 5) * 100, 100)}%`, transition:'width 0.6s ease',
              }} />
            </div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textAlign:'right', marginBottom:16 }}>
              {Math.round((currentStep / 5) * 100)}% complete
            </div>

            <StepTracker currentStep={currentStep} failed={false} failedStep={null} />

            {/* Waiting note */}
            {currentStep >= 2 && currentStep < 3 && (
              <div style={{
                marginTop:12, padding:'9px 12px', background:'rgba(251,191,36,0.07)',
                border:'0.5px solid rgba(251,191,36,0.2)', borderRadius:7,
                fontSize:11, color:'rgba(255,255,255,0.5)',
              }}>
                ⏳ Waiting for GoGetSSL to validate the DNS TXT record.
                This typically takes 2–5 minutes. The page updates automatically.
              </div>
            )}
          </div>

          {/* Right: config summary */}
          <div>
            <div style={{
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:16, marginBottom:12,
            }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 }}>
                Job configuration
              </div>
              <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse' }}>
                {[
                  ['Domain',   selectedDomain],
                  ['Product',  'RapidSSL DV 199d'],
                  ['DNS',      prefill?.dnsCred?.provider || '—'],
                  ['Install',  prefill?.installLabel || 'Auto-detect'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color:'rgba(255,255,255,0.35)', padding:'4px 0', width:'40%' }}>{k}</td>
                    <td style={{ color:'#e8e0d8', padding:'4px 0', fontWeight:500, fontFamily: k==='Domain'?'monospace':'inherit' }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>

            <div style={{
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:16,
            }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                What's happening
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.8 }}>
                {currentStep <= 1 && 'Placing order with GoGetSSL and generating keypair…'}
                {currentStep === 2 && 'DNS TXT record added. GoGetSSL is verifying domain ownership…'}
                {currentStep === 3 && 'DCV validated! Certificate issued. Starting install…'}
                {currentStep === 4 && 'Installing certificate on your server…'}
                {currentStep >= 5 && 'Done! Verifying certificate is live on server…'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PHASE: DONE ── */}
      {phase === 'done' && (
        <div style={{ maxWidth:480, margin:'32px auto 0', textAlign:'center' }}>
          <div style={{
            width:56, height:56, borderRadius:'50%', margin:'0 auto 16px',
            background:'rgba(74,222,128,0.12)', border:'2px solid rgba(74,222,128,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <CheckCircle size={26} strokeWidth={1.8} color="#4ade80" />
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:'#fff', marginBottom:6, letterSpacing:'-0.3px' }}>
            {certResult?.domain} is secured
          </div>
          <div style={{ fontSize:12, color:'#b0a8a0', marginBottom:24 }}>
            Certificate issued, installed and verified
          </div>

          <div style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:10, padding:16, marginBottom:16, textAlign:'left',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div style={{ background:'rgba(74,222,128,0.08)', border:'0.5px solid rgba(74,222,128,0.2)',
                borderRadius:7, padding:'10px 12px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(74,222,128,0.6)', textTransform:'uppercase',
                  letterSpacing:'0.4px', marginBottom:3 }}>Valid until</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#4ade80' }}>
                  {fmtDate(certResult?.expires_at)}
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.09)',
                borderRadius:7, padding:'10px 12px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase',
                  letterSpacing:'0.4px', marginBottom:3 }}>Installed via</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', textTransform:'capitalize' }}>
                  {certResult?.install_method || 'auto'}
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
                <Check size={12} color="#4ade80" strokeWidth={2.5} />
                <span style={{ fontSize:11, color:'#b0a8a0' }}>Auto-renewal enabled</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
                <Wifi size={12} color="#4ade80" strokeWidth={2} />
                <span style={{ fontSize:11, color:'#b0a8a0' }}>Live on server</span>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={handleReset} style={{
              padding:'9px 18px', borderRadius:7, fontSize:12, fontWeight:600,
              border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.07)',
              color:'#e8e0d8', cursor:'pointer', fontFamily:'inherit',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <Zap size={13} strokeWidth={2} /> Issue another
            </button>
          </div>
        </div>
      )}

      {/* ── PHASE: FAILED ── */}
      {phase === 'failed' && (
        <div style={{ maxWidth:560, margin:'24px auto 0' }}>
          <div style={{
            background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)',
            borderRadius:10, padding:16, marginBottom:16,
            display:'flex', alignItems:'flex-start', gap:12,
          }}>
            <AlertTriangle size={18} strokeWidth={2} color="#f87171" style={{ flexShrink:0, marginTop:2 }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#f87171', marginBottom:4 }}>
                Stopped at step {failedStep}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                {failedReason}
              </div>
            </div>
          </div>

          <StepTracker currentStep={failedStep - 1} failed={true} failedStep={failedStep} />

          {/* What was saved */}
          {orderId && (
            <div style={{
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:14, marginTop:12, marginBottom:16,
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                What was saved
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>
                <Check size={11} color="#4ade80" strokeWidth={2.5} />
                GoGetSSL order created — no charge lost
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>
                <Check size={11} color="#4ade80" strokeWidth={2.5} />
                Private key stored securely in KeyLocker
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, color:'rgba(255,255,255,0.5)' }}>
                <Info size={11} color="#fbbf24" strokeWidth={2} />
                Fix the issue above, then retry — no duplicate order
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleReset} style={{
              flex:1, padding:'10px', borderRadius:7, fontSize:12, fontWeight:600,
              border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
              color:'#e8e0d8', cursor:'pointer', fontFamily:'inherit',
            }}>
              ← Start over
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ag-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}
