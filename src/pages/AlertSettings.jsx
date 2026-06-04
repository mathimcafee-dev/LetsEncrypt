// AlertSettings.jsx — email expiry alert configuration
// Design: identical to KeyLocker.jsx — design-v2.css, same inline styles, same colours
import { useState, useEffect } from 'react'
import { Bell, Mail, Save, RefreshCw, CheckCircle, AlertTriangle, Send, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import '../styles/design-v2.css'

const ALL_THRESHOLDS = [90, 60, 30, 14, 7, 3, 1]
const DEFAULT_DAYS   = [30, 14, 7, 1]
const DEFAULT_TYPES  = ['cert_expiry', 'order_renewal']
const ALERT_TYPES = [
  { key:'cert_expiry',   label:'Certificate expiry',   desc:'Alert before a certificate expires' },
  { key:'order_renewal', label:'Subscription renewal', desc:'Alert before a paid subscription ends' },
  { key:'pqc_risk',      label:'PQC risk',             desc:'Alert on quantum-vulnerable keys' },
]

export default function AlertSettings({ nav }) {
  const { user, loading: authLoading } = useAuth()

  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [testing,     setTesting]     = useState(false)
  const [testResult,  setTestResult]  = useState(null)
  const [error,       setError]       = useState('')

  const [emailEnabled,  setEmailEnabled]  = useState(true)
  const [alertDays,     setAlertDays]     = useState(DEFAULT_DAYS)
  const [alertTypes,    setAlertTypes]    = useState(DEFAULT_TYPES)
  const [extraEmails,   setExtraEmails]   = useState([])
  const [slackWebhook,  setSlackWebhook]  = useState('')
  const [newEmail,      setNewEmail]      = useState('')

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('user_settings')
        .select('email_alerts,alert_days,alert_types,extra_emails,slack_webhook')
        .eq('user_id', user.id).single()
      if (data) {
        setEmailEnabled(data.email_alerts !== false)
        setAlertDays(data.alert_days    || DEFAULT_DAYS)
        setAlertTypes(data.alert_types  || DEFAULT_TYPES)
        setExtraEmails(data.extra_emails || [])
        setSlackWebhook(data.slack_webhook || '')
      }
      setLoading(false)
    })()
  }, [user?.id])

  const toggleDay  = (d) => setAlertDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d].sort((a,b)=>b-a))
  const toggleType = (t) => setAlertTypes(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t])

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase()
    if (!e || !e.includes('@') || extraEmails.includes(e)) return
    setExtraEmails(p => [...p, e]); setNewEmail('')
  }

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    const { error: err } = await supabase.from('user_settings').upsert({
      user_id: user.id, email_alerts: emailEnabled,
      alert_days: alertDays, alert_types: alertTypes,
      extra_emails: extraEmails, slack_webhook: slackWebhook || null,
    }, { onConflict:'user_id' })
    if (err) setError(err.message)
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      const res = await fetch('https://frthcwkntciaakqsppss.supabase.co/functions/v1/send-alert', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({ type:'test', domain:'test.example.com', data:{} }),
      })
      const d = await res.json()
      setTestResult(d.ok ? 'ok' : 'fail')
    } catch { setTestResult('fail') }
    setTesting(false)
  }

  const inputStyle = {
    width:'100%', padding:'9px 12px', fontSize:12, borderRadius:8,
    border:'1px solid var(--v2-border)', background:'var(--v2-surface)',
    color:'#111111', fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  }

  if (authLoading || loading) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <RefreshCw size={22} style={{ animation:'spin .8s linear infinite' }} color="var(--v2-text-3)"/>
    </div>
  )

  if (!user) return (
    <div className="v2-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:15, fontWeight:700, color:'#111111', marginBottom:12 }}>Sign in to manage alerts</div>
        <button className="v2-btn v2-btn-primary" onClick={() => nav('/auth')}>Sign in</button>
      </div>
    </div>
  )

  return (
    <div className="v2-page">
      <div className="v2-container" style={{ maxWidth:960, padding:'40px 24px 80px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10,
              background:'linear-gradient(135deg,#f07059,#C45A4A)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bell size={18} color="white"/>
            </div>
            <div>
              <h1 className="v2-h1">Alert settings</h1>
              <p style={{ fontSize:12, color:'#888888', marginTop:2 }}>
                Configure when SSLVault notifies you about certificate events
              </p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="v2-btn v2-btn-sm" onClick={handleTest} disabled={testing}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              {testing
                ? <><RefreshCw size={11} style={{ animation:'spin .7s linear infinite' }}/> Sending…</>
                : <><Send size={11}/> Test email</>}
            </button>
            <button className="v2-btn v2-btn-sm" onClick={handleSave} disabled={saving}
              style={{ display:'flex', alignItems:'center', gap:5,
                background: saved ? 'transparent' : undefined,
                border: saved ? '1px solid rgba(31,92,78,0.2)' : undefined,
                color: saved ? '#16a068' : undefined }}>
              {saving  ? <><RefreshCw size={11} style={{ animation:'spin .7s linear infinite' }}/> Saving…</> :
               saved   ? <><CheckCircle size={11}/> Saved</>   : <><Save size={11}/> Save</>}
            </button>
          </div>
        </div>

        {/* Banners */}
        {error && (
          <div style={{ background:'rgba(31,92,78,0.09)', border:'0.5px solid #fecaca', borderRadius:8,
            padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center',
            gap:8, fontSize:12, color:'#1f5c4e' }}>
            <AlertTriangle size={13} style={{ flexShrink:0 }}/> {error}
            <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none',
              border:'none', cursor:'pointer', color:'#1f5c4e', fontSize:16 }}>×</button>
          </div>
        )}
        {testResult === 'ok' && (
          <div style={{ background:'transparent', border:'1px solid rgba(31,92,78,0.2)', borderRadius:8,
            padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center',
            gap:8, fontSize:12, color:'#111111' }}>
            <CheckCircle size={13} style={{ flexShrink:0 }}/> Test email sent to {user.email}
          </div>
        )}
        {testResult === 'fail' && (
          <div style={{ background:'rgba(31,92,78,0.09)', border:'0.5px solid #fecaca', borderRadius:8,
            padding:'10px 14px', marginBottom:14, fontSize:12, color:'#1f5c4e' }}>
            Test failed — check RESEND_API_KEY in Supabase environment variables.
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* LEFT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Email toggle */}
            <div className="v2-card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Mail size={13} color="#b0a8a0"/>
                  <span style={{ fontSize:13, fontWeight:500, color:'#111111' }}>Email notifications</span>
                </div>
                <button onClick={() => setEmailEnabled(v => !v)} style={{
                  width:36, height:20, borderRadius:100, border:'none', cursor:'pointer',
                  background: emailEnabled ? '#1f5c4e' : 'var(--v2-surface-3)',
                  position:'relative', transition:'background 0.15s', flexShrink:0,
                }}>
                  <div style={{
                    width:14, height:14, borderRadius:'50%', background:'#ffffff',
                    position:'absolute', top:3, left: emailEnabled ? 19 : 3,
                    transition:'left 0.15s',
                  }}/>
                </button>
              </div>
              <div style={{ fontSize:11, color:'#888888' }}>
                {emailEnabled ? `Alerts sent to ${user.email}` : 'All email alerts disabled'}
              </div>
            </div>

            {/* Thresholds */}
            <div className="v2-card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:600, color:'#888888', textTransform:'uppercase',
                letterSpacing:'0.5px', marginBottom:10 }}>Alert thresholds (days before expiry)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {ALL_THRESHOLDS.map(d => {
                  const on = alertDays.includes(d)
                  return (
                    <button key={d} onClick={() => toggleDay(d)} style={{
                      padding:'4px 12px', borderRadius:6, fontSize:12, fontWeight: on ? 600 : 400,
                      cursor:'pointer', fontFamily:'inherit',
                      border: on ? '0.5px solid #2a6b5c' : '1px solid var(--v2-border)',
                      background: on ? 'rgba(31,92,78,0.09)' : 'var(--v2-surface-3)',
                      color: on ? '#111111' : '#b0a8a0', transition:'all 0.1s',
                    }}>
                      {d}d
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Alert types */}
            <div className="v2-card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:600, color:'#888888', textTransform:'uppercase',
                letterSpacing:'0.5px', marginBottom:12 }}>Alert types</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {ALERT_TYPES.map(({ key, label, desc }) => {
                  const on = alertTypes.includes(key)
                  return (
                    <label key={key} style={{ display:'flex', alignItems:'flex-start', gap:9, cursor:'pointer' }}>
                      <div onClick={() => toggleType(key)} style={{
                        width:15, height:15, borderRadius:3, flexShrink:0, marginTop:2,
                        border: on ? '1.5px solid #2a6b5c' : '1.5px solid var(--v2-border)',
                        background: on ? '#1f5c4e' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                      }}>
                        {on && <div style={{ width:7, height:7, background:'white', borderRadius:1 }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color:'#333333' }}>{label}</div>
                        <div style={{ fontSize:11, color:'#888888' }}>{desc}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Extra recipients */}
            <div className="v2-card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:600, color:'#888888', textTransform:'uppercase',
                letterSpacing:'0.5px', marginBottom:10 }}>Additional recipients</div>
              <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                <input type="email" placeholder="colleague@company.com" value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEmail()}
                  style={{ ...inputStyle, flex:1 }}/>
                <button className="v2-btn v2-btn-sm" onClick={addEmail}
                  style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <Plus size={11}/> Add
                </button>
              </div>
              {extraEmails.length === 0
                ? <div style={{ fontSize:11, color:'#888888', fontStyle:'italic' }}>No additional recipients</div>
                : extraEmails.map(e => (
                  <div key={e} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'6px 10px', borderRadius:6, marginBottom:5,
                    background:'var(--v2-surface-3)', border:'1px solid var(--v2-border)',
                    fontSize:11, color:'#333333', fontFamily:'monospace' }}>
                    {e}
                    <button onClick={() => setExtraEmails(p => p.filter(x => x !== e))}
                      style={{ background:'none', border:'none', cursor:'pointer',
                        color:'#888888', padding:'0 2px', lineHeight:1 }}>
                      <X size={10}/>
                    </button>
                  </div>
                ))
              }
            </div>

            {/* Slack webhook */}
            <div className="v2-card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:600, color:'#888888', textTransform:'uppercase',
                letterSpacing:'0.5px', marginBottom:4 }}>Slack webhook
                <span style={{ marginLeft:6, fontSize:9, color:'#888888', fontWeight:400,
                  textTransform:'none', letterSpacing:0 }}>(optional)</span>
              </div>
              <div style={{ fontSize:11, color:'#888888', marginBottom:8 }}>Post alerts to a Slack channel</div>
              <input type="url" placeholder="https://hooks.slack.com/services/…"
                value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
                style={inputStyle}/>
            </div>

            {/* Summary */}
            <div className="v2-card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:9, fontWeight:600, color:'#888888', textTransform:'uppercase',
                letterSpacing:'0.5px', marginBottom:10 }}>Current configuration</div>
              {[
                { label:'Email',      value: emailEnabled ? 'Enabled' : 'Disabled', warn: !emailEnabled },
                { label:'Thresholds', value: alertDays.length ? alertDays.map(d=>`${d}d`).join(', ') : 'None' },
                { label:'Types',      value: alertTypes.length + ' enabled' },
                { label:'Extra CC',   value: extraEmails.length ? extraEmails.length + ' address(es)' : 'None' },
                { label:'Slack',      value: slackWebhook ? 'Configured' : 'Not set' },
              ].map(({ label, value, warn }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between',
                  fontSize:11, padding:'5px 0', borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                  <span style={{ color:'#888888' }}>{label}</span>
                  <span style={{ fontWeight:500, color: warn ? '#1f5c4e' : '#333333' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
