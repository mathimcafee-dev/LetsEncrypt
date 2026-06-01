import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SB_URL = 'https://frthcwkntciaakqsppss.supabase.co'

export default function SLADashboard({ nav }) {
  const [txt, setTxt] = useState('Loading...')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setTxt('No session'); return }
      fetch(SB_URL + '/functions/v1/sla-manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
        body: JSON.stringify({ action: 'get_status' }),
      })
        .then(r => r.json())
        .then(d => setTxt('has_sla:' + d.has_sla + ' score:' + d.compliance_score + ' certs:' + (d.total_certs || 0)))
        .catch(e => setTxt('fetch error: ' + e.message))
    })
  }, [])

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#1a0808',
      color: '#ffffff',
      padding: 40,
      fontSize: 16,
      zIndex: 10,
    }}>
      <h2 style={{ color: '#c0392b', marginBottom: 20 }}>SLA Coverage</h2>
      <p>{txt}</p>
    </div>
  )
}
