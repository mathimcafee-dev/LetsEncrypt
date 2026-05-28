import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'SSLVault <notifications@easysecurity.in>'
const SB_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn('RESEND_API_KEY not set'); return false }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return r.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const auth = req.headers.get('Authorization') || ''
    const { data: { user } } = await createClient(SB_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: auth } }
    }).auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { type, domain, data: payload } = body

    const email = user.email || ''

    let subject = '', html = ''

    if (type === 'test') {
      subject = '✅ SSLVault test alert — working'
      html = `<p>Your SSLVault alert system is working correctly. This is a test email sent at ${new Date().toISOString()}.</p>`
    } else if (type === 'cert_expiry') {
      subject = `⚠️ Certificate expiring: ${domain}`
      html = `<p>Your certificate for <strong>${domain}</strong> is expiring in ${payload?.days_left || '?'} days.</p><p>Log in to SSLVault to renew it.</p>`
    } else if (type === 'cert_issued') {
      subject = `✅ Certificate issued: ${domain}`
      html = `<p>Your certificate for <strong>${domain}</strong> has been issued successfully.</p>`
    } else {
      subject = `SSLVault: ${type}`
      html = `<p>Alert type: ${type}. Domain: ${domain || 'N/A'}.</p>`
    }

    const sent = await sendEmail(email, subject, html)

    // Log alert
    const db = createClient(SB_URL, SERVICE_KEY)
    try { await db.from('alert_log').insert({ user_id: user.id, type, domain: domain || null, sent_at: new Date().toISOString(), sent }) } catch {}

    return json({ ok: true, sent, email_sent_to: email })
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
})
