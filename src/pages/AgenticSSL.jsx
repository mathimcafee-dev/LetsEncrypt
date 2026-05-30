// AgenticSSL.jsx v2 — One-click certificate issuance + install
// Improvements over v1:
//   1. Shows existing active cert banner before issuing
//   2. Detects pending orders for same domain → resumes watching instead of duplicate order
//   3. "CA processing" state (step 2.5) covers GGS API lag after cert issued by email
//   4. Duplicate order protection: place_order already deduplicates in gogetssl-issue
//   5. 15s poll interval for snappy UI updates

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Zap, Shield, Globe, Server, User, Check, X,
  RefreshCw, AlertTriangle, ChevronDown, Info,
  CheckCircle, Clock, Wifi, RotateCcw, ShieldCheck
} from 'lucide-react'
import '../styles/design-v2.css'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'
const GGS_FN = `${SB_URL}/functions/v1/gogetssl-issue`

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'

const daysLeft = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

// ── Steps (includes 2.5 = CA processing) ─────────────────────────────
// We map 1-5 internally but display 1-5 to user
const STEPS = [
  { id:1, label:'Order placed',       sub:'GoGetSSL RapidSSL DV'          },
  { id:2, label:'DNS TXT added',      sub:'Auto DCV challenge via API'    },
  { id:3, label:'DCV validated',      sub:'GoGetSSL confirms ownership'   },
  { id:4, label:'Certificate installed', sub:'Automatic install on server'},
  { id:5, label:'Verified live',      sub:'Cert active on your server'    },
]

// ── Step tracker ──────────────────────────────────────────────────────
function StepTracker({ currentStep, failed, failedStep, caProcessing }) {
  return (
    <div style={{ padding:'16px 0' }}>
      {STEPS.map((step, idx) => {
        const done    = currentStep > step.id
        const active  = currentStep === step.id && !failed
        const isFail  = failed && failedStep === step.id
        const waiting = currentStep < step.id && !failed
        // Special: between step 2 and 3, show CA processing spinner
        const isCAProc = caProcessing && step.id === 3 && currentStep === 2

        const dotColor = done ? '#4ade80'
          : isFail ? '#f87171'
          : active || isCAProc ? '#ff8c7a'
          : 'rgba(255,255,255,0.12)'
        const dotBorder = done ? '#4ade80'
          : isFail ? '#f87171'
          : active || isCAProc ? '#c0392b'
          : 'rgba(255,255,255,0.15)'

        return (
          <div key={step.id}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', flexShrink:0,
                  background: dotColor === 'rgba(255,255,255,0.12)' ? 'rgba(255,255,255,0.04)' : `${dotColor}18`,
                  border:`2px solid ${dotBorder}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: (active || isCAProc) ? `0 0 0 4px rgba(192,57,43,0.2)` : 'none',
                  transition:'all 0.3s',
                }}>
                  {done   && <Check size={13} strokeWidth={3} color="#4ade80" />}
                  {isFail && <X size={12} strokeWidth={2.5} color="#f87171" />}
                  {(active || isCAProc) && (
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#ff8c7a',
                      animation:'ag-pulse 1s ease-in-out infinite' }} />
                  )}
                  {waiting && !isCAProc && (
                    <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)' }}>{step.id}</span>
                  )}
                </div>
              </div>
              <div style={{ flex:1, paddingTop:4, paddingBottom: idx < STEPS.length-1 ? 16 : 0 }}>
                <div style={{
                  fontSize:12, fontWeight:600,
                  color: done ? '#4ade80'
                    : isFail ? '#f87171'
                    : active || isCAProc ? '#ffffff'
                    : 'rgba(255,255,255,0.3)',
                  marginBottom:2,
                }}>
                  {step.label}
                  {active && !isCAProc && (
                    <span style={{ marginLeft:8, fontSize:10, color:'#ff8c7a', fontWeight:400 }}>running…</span>
                  )}
                  {isCAProc && (
                    <span style={{ marginLeft:8, fontSize:10, color:'#fbbf24', fontWeight:400 }}>CA processing…</span>
                  )}
                </div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{step.sub}</div>
                {isCAProc && (
                  <div style={{
                    marginTop:6, fontSize:10, color:'rgba(255,255,255,0.4)', lineHeight:1.6,
                    background:'rgba(251,191,36,0.07)', border:'0.5px solid rgba(251,191,36,0.2)',
                    borderRadius:6, padding:'6px 10px',
                  }}>
                    Certificate issued by CA — our system picks it up within 5 min.
                    You can safely close this page.
                  </div>
                )}
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                width:1.5, height:16,
                background: done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.07)',
                marginLeft:13, transition:'background 0.3s',
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
  const colors = {
    ok:      { bg:'rgba(74,222,128,0.08)',  border:'rgba(74,222,128,0.2)',  icon:'#4ade80', badge:'rgba(74,222,128,0.12)', badgeText:'#4ade80',  badgeLabel:'Auto'    },
    warn:    { bg:'rgba(251,191,36,0.07)',  border:'rgba(251,191,36,0.2)',  icon:'#fbbf24', badge:'rgba(251,191,36,0.12)', badgeText:'#fbbf24',  badgeLabel:'Manual'  },
    missing: { bg:'rgba(248,113,113,0.07)', border:'rgba(248,113,113,0.2)', icon:'#f87171', badge:'rgba(248,113,113,0.12)',badgeText:'#f87171',  badgeLabel:'Missing' },
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
        background:c.badge, color:c.badgeText, border:`0.5px solid ${c.icon}30`,
        textTransform:'uppercase', letterSpacing:'0.4px', flexShrink:0,
      }}>{c.badgeLabel}</span>
    </div>
  )
}

// ── Existing cert banner ──────────────────────────────────────────────
function ExistingCertBanner({ cert, pendingOrder }) {
  if (pendingOrder) {
    return (
      <div style={{
        display:'flex', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:10,
        background:'rgba(251,191,36,0.08)', border:'0.5px solid rgba(251,191,36,0.25)',
      }}>
        <Clock size={14} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:'#fbbf24', marginBottom:2 }}>
            Pending order in progress
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>
            A certificate order for this domain is already being processed (GGS #{pendingOrder.ggs_order_id}).
            Issuing again will create a duplicate order. The existing order will complete automatically.
          </div>
        </div>
      </div>
    )
  }
  if (cert) {
    const d = daysLeft(cert.expires_at)
    return (
      <div style={{
        display:'flex', gap:10, padding:'10px 14px', borderRadius:8, marginBottom:10,
        background:'rgba(74,222,128,0.06)', border:'0.5px solid rgba(74,222,128,0.2)',
      }}>
        <ShieldCheck size={14} color="#4ade80" style={{ flexShrink:0, marginTop:1 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#4ade80', marginBottom:2 }}>
            Active certificate — {d}d remaining
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>
            Expires {fmtDate(cert.expires_at)}. Issuing will replace it with a new 199-day certificate.
          </div>
        </div>
      </div>
    )
  }
  return null
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function AgenticSSL({ user }) {
  // ── Data ──────────────────────────────────────────────────────────
  const [profiles,   setProfiles]   = useState([])
  const [dnsCreds,   setDnsCreds]   = useState([])
  const [servers,    setServers]    = useState([])
  const [agents,     setAgents]     = useState([])
  const [loading,    setLoading]    = useState(true)

  // ── Domain + prefill ─────────────────────────────────────────────
  const [selectedDomain, setSelectedDomain] = useState('')
  const [prefill,        setPrefill]        = useState(null)
  const [existingCert,   setExistingCert]   = useState(null)  // active cert if any
  const [pendingOrder,   setPendingOrder]   = useState(null)  // dv_pending order if any
  const [domainLoading,  setDomainLoading]  = useState(false)

  // ── Pipeline state ────────────────────────────────────────────────
  const [phase,        setPhase]       = useState('select')
  const [currentStep,  setCurrentStep] = useState(0)
  const [caProcessing, setCaProcessing] = useState(false) // step 2 done but cert not active yet
  const [failedStep,   setFailedStep]  = useState(null)
  const [failedReason, setFailedReason] = useState('')
  const [orderId,      setOrderId]     = useState(null)
  const [ggsOrderId,   setGgsOrderId]  = useState(null)
  const [certResult,   setCertResult]  = useState(null)

  const orderChannelRef = useRef(null)
  const certChannelRef  = useRef(null)
  const pollRef         = useRef(null)

  // ── Load base data ────────────────────────────────────────────────
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

  // ── Eligible domains for dropdown ─────────────────────────────────
  // Must have domain_profile AND dns_credentials
  const eligibleDomains = profiles.filter(p => {
    const apex = p.domain.split('.').slice(-2).join('.')
    return dnsCreds.some(c => {
      const cp = (c.domain_pattern || '').toLowerCase()
      return cp === p.domain.toLowerCase() || cp === apex || cp === `*.${apex}`
    })
  })

  // ── When domain selected: build prefill + check existing certs ────
  useEffect(() => {
    if (!selectedDomain) {
      setPrefill(null); setExistingCert(null); setPendingOrder(null)
      return
    }
    const profile = profiles.find(p => p.domain === selectedDomain)
    if (!profile) { setPrefill(null); return }

    // DNS cred
    const apex = selectedDomain.split('.').slice(-2).join('.')
    const dnsCred = dnsCreds.find(c => {
      const cp = (c.domain_pattern || '').toLowerCase()
      return cp === selectedDomain.toLowerCase() || cp === apex || cp === `*.${apex}`
    })

    // Install target — first check server_credentials.domains
    const serverMatch = servers.find(s =>
      Array.isArray(s.domains) && s.domains.includes(selectedDomain)
    )
    let installMethod = null, installLabel = null

    if (serverMatch) {
      if (serverMatch.server_type === 'cpanel' || serverMatch.server_type === 'shared') {
        installMethod = 'cpanel'
        installLabel  = `cPanel · ${serverMatch.nickname}`
      } else if (serverMatch.agent_id) {
        const agent = agents.find(a => a.id === serverMatch.agent_id)
        const online = agent?.last_seen_at
          ? (Date.now() - new Date(agent.last_seen_at).getTime()) < 15 * 60 * 1000
          : false
        installMethod = 'agent'
        installLabel  = `Agent · ${agent?.nickname || serverMatch.nickname}${online ? ' · online' : ' · offline'}`
      }
    }

    // Fallback: any online persistent agent
    if (!installMethod) {
      const onlineAgent = agents.find(a => {
        if (!a.last_seen_at) return false
        return (Date.now() - new Date(a.last_seen_at).getTime()) < 15 * 60 * 1000
      })
      if (onlineAgent) {
        // Check if agent nickname matches domain
        const agentMatchesDomain = onlineAgent.nickname === selectedDomain ||
          onlineAgent.nickname?.includes(selectedDomain.split('.')[0])
        if (agentMatchesDomain) {
          installMethod = 'agent'
          installLabel  = `Agent · ${onlineAgent.nickname} · online`
        }
      }
    }

    setPrefill({ profile, dnsCred, installMethod, installLabel })

    // Check for existing active cert + pending orders
    const checkExisting = async () => {
      setDomainLoading(true)
      try {
        // Most recent active cert
        const { data: certs } = await supabase
          .from('certificates')
          .select('id,domain,status,expires_at,ggs_order_id,is_current')
          .eq('user_id', user.id)
          .eq('domain', selectedDomain)
          .eq('status', 'active')
          .order('expires_at', { ascending: false })
          .limit(1)
        setExistingCert(certs?.[0] || null)

        // Most recent pending order (dv_pending) — skip if duplicate detection
        const { data: orders } = await supabase
          .from('ssl_orders')
          .select('id,ggs_order_id,status,created_at')
          .eq('user_id', user.id)
          .eq('domain', selectedDomain)
          .eq('status', 'dv_pending')
          .order('created_at', { ascending: false })
          .limit(1)
        setPendingOrder(orders?.[0] || null)
      } catch(e) { console.error('[AgenticSSL] checkExisting:', e) }
      setDomainLoading(false)
    }
    checkExisting()
  }, [selectedDomain, profiles, dnsCreds, servers, agents, user?.id])

  // ── Realtime subscription ─────────────────────────────────────────
  const subscribeToOrder = useCallback((ordId, ggsId) => {
    if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current)
    if (certChannelRef.current)  supabase.removeChannel(certChannelRef.current)

    // Watch ssl_orders
    orderChannelRef.current = supabase
      .channel(`agentic-order-${ordId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'ssl_orders',
        filter: `id=eq.${ordId}`
      }, (payload) => {
        const row = payload.new
        if (row.dcv_txt_value) setCurrentStep(s => Math.max(s, 2))
        if (row.status === 'active') {
          setCaProcessing(false)
          setCurrentStep(s => Math.max(s, 3))
        }
      })
      .subscribe()

    // Watch certificates by ggs_order_id
    certChannelRef.current = supabase
      .channel(`agentic-cert-${ggsId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'certificates',
        filter: `ggs_order_id=eq.${ggsId}`
      }, (payload) => {
        const row = payload.new
        if (row.status === 'active') {
          setCaProcessing(false)
          setCurrentStep(s => Math.max(s, 3))
        }
        if (row.install_method || row.agent_id) setCurrentStep(s => Math.max(s, 4))
        if (row.is_live_on_server === true) {
          setCurrentStep(5)
          setCertResult({
            domain:         row.domain,
            expires_at:     row.expires_at,
            install_method: row.install_method || (row.agent_id ? 'agent' : 'auto'),
            is_live:        true,
          })
          setTimeout(() => setPhase('done'), 600)
        }
        if (row.status === 'active' && !row.is_live_on_server) {
          setCurrentStep(s => Math.max(s, 4))
        }
      })
      .subscribe()
  }, [])

  // ── Poll fallback every 15s ───────────────────────────────────────
  const startPoll = useCallback((ordId, ggsId) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { data: order } = await supabase
          .from('ssl_orders')
          .select('status,dcv_txt_value,ggs_status')
          .eq('id', ordId)
          .single()

        if (order?.dcv_txt_value) setCurrentStep(s => Math.max(s, 2))
        if (order?.status === 'active') {
          setCaProcessing(false)
          setCurrentStep(s => Math.max(s, 3))
        }
        // If dns added but ssl_orders still processing — show CA processing banner
        if (order?.dcv_txt_value && order?.status === 'dv_pending') {
          setCaProcessing(true)
          setCurrentStep(s => Math.max(s, 2))
        }

        const { data: cert } = await supabase
          .from('certificates')
          .select('status,install_status,is_live_on_server,domain,expires_at,install_method,agent_id')
          .eq('ggs_order_id', ggsId)
          .eq('user_id', user?.id)
          .maybeSingle()

        if (cert?.status === 'active') {
          setCaProcessing(false)
          setCurrentStep(s => Math.max(s, 3))
        }
        if (cert?.install_method || cert?.agent_id) setCurrentStep(s => Math.max(s, 4))
        if (cert?.is_live_on_server === true) {
          setCurrentStep(5)
          setCertResult({
            domain:         cert.domain,
            expires_at:     cert.expires_at,
            install_method: cert.install_method || (cert.agent_id ? 'agent' : 'auto'),
            is_live:        true,
          })
          clearInterval(pollRef.current)
          setTimeout(() => setPhase('done'), 600)
        }
        if (cert?.status === 'active' && cert?.is_live_on_server !== true) {
          setCurrentStep(s => Math.max(s, 4))
        }
      } catch(e) { console.warn('[AgenticSSL] poll error:', e) }
    }, 15000)
  }, [user?.id])

  useEffect(() => {
    return () => {
      if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current)
      if (certChannelRef.current)  supabase.removeChannel(certChannelRef.current)
      if (pollRef.current)         clearInterval(pollRef.current)
    }
  }, [])

  // ── Issue & Install ───────────────────────────────────────────────
  const handleIssueAndInstall = async () => {
    if (!prefill || !selectedDomain) return
    const { profile } = prefill

    if (!profile.first_name || !profile.last_name || !profile.email || !profile.phone) {
      alert('Domain profile is incomplete. Please update it in DNS Providers.')
      return
    }

    setPhase('running')
    setCurrentStep(1)
    setCaProcessing(false)
    setFailedStep(null)
    setFailedReason('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // place_order — deduplication is built into gogetssl-issue:
      // if a dv_pending order exists for this domain, it returns that order
      const res = await fetch(GGS_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action:       'place_order',
          domain:       selectedDomain,
          period:       12,
          product_code: 'rapidssl',
          firstName:    profile.first_name,
          lastName:     profile.last_name,
          adminEmail:   profile.email,
          phone:        profile.phone,
        }),
      })

      const data = await res.json()

      if (!data.ok && !data.order_id) {
        setPhase('failed')
        setFailedStep(1)
        setFailedReason(data.error || 'Order placement failed — GoGetSSL rejected the request')
        return
      }

      // Step 1 done
      setOrderId(data.order_id)
      setGgsOrderId(data.ggs_order_id)

      if (data._duplicate) {
        // Existing pending order returned — already past step 1+2
        setCurrentStep(2)
        setCaProcessing(true) // likely already past DNS, waiting on CA
      } else {
        setCurrentStep(2)
        if (data.dcv_txt_value) {
          // DNS added inline by place_order
          console.log('[AgenticSSL] DNS TXT added:', data.dcv_txt_name)
        }
      }

      subscribeToOrder(data.order_id, data.ggs_order_id)
      startPoll(data.order_id, data.ggs_order_id)

    } catch(e) {
      console.error('[AgenticSSL] error:', e)
      setPhase('failed')
      setFailedStep(1)
      setFailedReason(e.message || 'Unexpected error')
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────
  const handleReset = () => {
    if (orderChannelRef.current) supabase.removeChannel(orderChannelRef.current)
    if (certChannelRef.current)  supabase.removeChannel(certChannelRef.current)
    if (pollRef.current)         clearInterval(pollRef.current)
    setPhase('select')
    setCurrentStep(0)
    setCaProcessing(false)
    setFailedStep(null); setFailedReason('')
    setOrderId(null); setGgsOrderId(null); setCertResult(null)
    setSelectedDomain(''); setPrefill(null)
    setExistingCert(null); setPendingOrder(null)
  }

  const isReady = !!(prefill?.profile && prefill?.dnsCred)

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="v2-page" style={{ padding:'24px 28px 80px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
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

      {/* ── SELECT PHASE ── */}
      {phase === 'select' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:900 }}>
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
                <div style={{ fontSize:12, color:'#b0a8a0' }}>Loading…</div>
              ) : eligibleDomains.length === 0 ? (
                <div style={{ padding:'12px', background:'rgba(251,191,36,0.07)',
                  border:'0.5px solid rgba(251,191,36,0.2)', borderRadius:7 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#fbbf24', marginBottom:4 }}>No eligible domains</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
                    Agentic SSL needs a domain profile + DNS credentials.
                    Add both in <span style={{ color:'#ff8c7a' }}>DNS Providers</span>.
                  </div>
                </div>
              ) : (
                <div style={{ position:'relative' }}>
                  <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}
                    style={{ width:'100%', padding:'10px 36px 10px 12px',
                      fontSize:13, fontWeight:500, fontFamily:'monospace', appearance:'none', cursor:'pointer' }}>
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

            {/* Existing cert / pending order banners */}
            {selectedDomain && !domainLoading && (
              <ExistingCertBanner cert={existingCert} pendingOrder={pendingOrder} />
            )}

            {/* Prefill checks */}
            {prefill && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                  textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                  Configuration prefilled
                </div>
                <CheckRow icon={User} label="Contact details"
                  detail={`${prefill.profile.first_name} ${prefill.profile.last_name} · ${prefill.profile.email}`}
                  status="ok" />
                <CheckRow icon={Globe} label="DNS provider"
                  detail={`${prefill.dnsCred?.provider || '?'} · ${prefill.dnsCred?.domain_pattern || selectedDomain}`}
                  status={prefill.dnsCred ? 'ok' : 'missing'} />
                <CheckRow icon={Server} label="Install target"
                  detail={prefill.installLabel || 'No server configured — cert stored, manual install'}
                  status={prefill.installMethod ? 'ok' : 'warn'} />
              </div>
            )}

            {/* No install target note */}
            {prefill && !prefill.installMethod && (
              <div style={{ display:'flex', gap:8, padding:'10px 12px', borderRadius:7,
                background:'rgba(251,191,36,0.07)', border:'0.5px solid rgba(251,191,36,0.2)', marginBottom:12 }}>
                <Info size={13} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                  No install target found. Cert will be issued and stored — install manually from Dashboard.
                </div>
              </div>
            )}

            {/* Estimate strip */}
            {selectedDomain && prefill && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
                background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.08)',
                borderRadius:7, marginBottom:16 }}>
                <Clock size={13} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  Estimated: <span style={{ color:'#ff8c7a', fontWeight:600 }}>3–8 minutes</span>
                  {' '}· No further action required
                </span>
              </div>
            )}

            {/* Issue button */}
            <button onClick={handleIssueAndInstall}
              disabled={!isReady || !selectedDomain || domainLoading}
              style={{
                width:'100%', padding:'13px', borderRadius:8, border:'none',
                fontSize:13, fontWeight:700,
                cursor: isReady && selectedDomain && !domainLoading ? 'pointer' : 'not-allowed',
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                background: isReady && selectedDomain && !domainLoading ? '#c0392b' : 'rgba(255,255,255,0.06)',
                color: isReady && selectedDomain && !domainLoading ? '#ffffff' : 'rgba(255,255,255,0.25)',
                transition:'all 0.15s',
              }}>
              <Zap size={15} strokeWidth={2} />
              {domainLoading ? 'Checking…'
                : !selectedDomain ? 'Select a domain first'
                : !isReady ? 'Setup incomplete'
                : 'Issue & Install'}
            </button>
          </div>

          {/* Right: pipeline preview */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:10, padding:16 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
              textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:4 }}>
              What happens when you click
            </div>
            <StepTracker currentStep={0} failed={false} failedStep={null} caProcessing={false} />
            <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(255,255,255,0.03)',
              border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:7 }}>
              <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>
                Powered by existing infrastructure
              </div>
              {['GoGetSSL RapidSSL DV — same CA as Issue cert',
                'Auto DNS via your connected provider',
                'Auto-install via cPanel or VPS agent',
                'Renewal calendar auto-scheduled'].map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <Check size={10} strokeWidth={2.5} color="rgba(74,222,128,0.6)" />
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RUNNING PHASE ── */}
      {phase === 'running' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:900 }}>
          <div>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:10, padding:20 }}>
              {/* Domain header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:32, height:32, borderRadius:7, background:'rgba(192,57,43,0.15)',
                  border:'1px solid rgba(192,57,43,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
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
                  height:'100%', background: caProcessing ? '#fbbf24' : '#c0392b',
                  borderRadius:2, width:`${Math.min((currentStep / 5) * 100, 100)}%`,
                  transition:'width 0.6s ease, background 0.3s',
                }} />
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textAlign:'right', marginBottom:16 }}>
                {Math.round((currentStep / 5) * 100)}% complete
              </div>

              <StepTracker currentStep={currentStep} failed={false} failedStep={null} caProcessing={caProcessing} />
            </div>
          </div>

          {/* Right: status + config */}
          <div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                Job configuration
              </div>
              <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse' }}>
                {[
                  ['Domain',  selectedDomain],
                  ['Product', 'RapidSSL DV 199d'],
                  ['DNS',     prefill?.dnsCred?.provider || '—'],
                  ['Install', prefill?.installLabel || 'Auto-detect'],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ color:'rgba(255,255,255,0.35)', padding:'4px 0', width:'40%' }}>{k}</td>
                    <td style={{ color:'#e8e0d8', padding:'4px 0', fontWeight:500,
                      fontFamily: k==='Domain' ? 'monospace' : 'inherit' }}>{v}</td>
                  </tr>
                ))}
              </table>
            </div>

            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:16 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>
                Status
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.8 }}>
                {currentStep <= 1 && 'Placing order with GoGetSSL, generating keypair…'}
                {currentStep === 2 && !caProcessing && 'DNS TXT record added. GoGetSSL verifying…'}
                {currentStep === 2 && caProcessing && (
                  <span style={{ color:'#fbbf24' }}>
                    Certificate issued by CA — waiting for our system to pull the cert.
                    Auto-picks up within 5 minutes via cron. Safe to close this page.
                  </span>
                )}
                {currentStep === 3 && 'DCV validated! Certificate activated. Starting install…'}
                {currentStep === 4 && 'Installing certificate on your server…'}
                {currentStep >= 5 && 'Verifying certificate is live…'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE PHASE ── */}
      {phase === 'done' && (
        <div style={{ maxWidth:480, margin:'32px auto 0', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 16px',
            background:'rgba(74,222,128,0.12)', border:'2px solid rgba(74,222,128,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CheckCircle size={26} strokeWidth={1.8} color="#4ade80" />
          </div>
          <div style={{ fontSize:20, fontWeight:700, color:'#fff', marginBottom:6, letterSpacing:'-0.3px' }}>
            {certResult?.domain} is secured
          </div>
          <div style={{ fontSize:12, color:'#b0a8a0', marginBottom:24 }}>
            Certificate issued, installed and verified live
          </div>

          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:10, padding:16, marginBottom:16, textAlign:'left' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div style={{ background:'rgba(74,222,128,0.08)', border:'0.5px solid rgba(74,222,128,0.2)',
                borderRadius:7, padding:'10px 12px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(74,222,128,0.6)',
                  textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>Valid until</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#4ade80' }}>
                  {fmtDate(certResult?.expires_at)}
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.09)',
                borderRadius:7, padding:'10px 12px' }}>
                <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.3)',
                  textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>Installed via</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff', textTransform:'capitalize' }}>
                  {certResult?.install_method || 'auto'}
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Auto-renewal enabled', Check], ['Live on server', Wifi]].map(([label, Icon], i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
                  background:'rgba(255,255,255,0.04)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7 }}>
                  <Icon size={12} color="#4ade80" strokeWidth={2} />
                  <span style={{ fontSize:11, color:'#b0a8a0' }}>{label}</span>
                </div>
              ))}
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

      {/* ── FAILED PHASE ── */}
      {phase === 'failed' && (
        <div style={{ maxWidth:560, margin:'24px auto 0' }}>
          <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)',
            borderRadius:10, padding:16, marginBottom:16,
            display:'flex', alignItems:'flex-start', gap:12 }}>
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
          <StepTracker currentStep={failedStep - 1} failed={true} failedStep={failedStep} caProcessing={false} />
          {orderId && (
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:10, padding:14, marginTop:12, marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.35)',
                textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>What was saved</div>
              {['GoGetSSL order created — no charge lost',
                'Private key stored securely in KeyLocker',
                'Fix the issue above, then retry — no duplicate order'].map((t, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11,
                  color:'rgba(255,255,255,0.5)', marginBottom:4 }}>
                  {i < 2
                    ? <Check size={11} color="#4ade80" strokeWidth={2.5} />
                    : <Info size={11} color="#fbbf24" strokeWidth={2} />}
                  {t}
                </div>
              ))}
            </div>
          )}
          <button onClick={handleReset} style={{
            width:'100%', padding:'10px', borderRadius:7, fontSize:12, fontWeight:600,
            border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
            color:'#e8e0d8', cursor:'pointer', fontFamily:'inherit',
          }}>← Start over</button>
        </div>
      )}

      <style>{`
        @keyframes ag-pulse {
          0%, 100% { opacity:1; transform:scale(1); }
          50%       { opacity:0.5; transform:scale(0.8); }
        }
      `}</style>
    </div>
  )
}
