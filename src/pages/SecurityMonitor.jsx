import { useState } from 'react'
import { ShieldAlert, Activity } from 'lucide-react'
import ShieldIntelligence from './ShieldIntelligence'
import SSLHealthScore from './SSLHealthScore'
import '../styles/design-v2.css'

export default function SecurityMonitor({ user }) {
  const [tab, setTab] = useState('ct')

  const tabs = [
    { id: 'ct',     label: 'CT Abuse Monitor', icon: ShieldAlert,
      desc: 'Detect unauthorised certificates issued for your domains' },
    { id: 'health', label: 'SSL Health Score',  icon: Activity,
      desc: 'Grade your domains A–F on expiry, HSTS, CAA and cipher strength' },
  ]

  return (
    <div className="v2-page">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 48px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="v2-h1" style={{ fontSize: 22, marginBottom: 4 }}>Security monitor</h1>
          <p style={{ fontSize: 13, color: '#b0a8a0', margin: 0 }}>
            Detect certificate abuse and score your SSL posture across all domains
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 28,
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', fontSize: 13,
              fontWeight: tab === id ? 600 : 400,
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              color: tab === id ? '#c0392b' : '#b0a8a0',
              borderBottom: tab === id ? '2px solid #c0392b' : '2px solid transparent',
              transition: 'all .15s',
            }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content — keep both mounted so state persists when switching */}
        <div style={{ display: tab === 'ct' ? 'block' : 'none' }}>
          <ShieldIntelligence user={user} embedded />
        </div>
        <div style={{ display: tab === 'health' ? 'block' : 'none' }}>
          <SSLHealthScore user={user} embedded />
        </div>

      </div>
    </div>
  )
}
