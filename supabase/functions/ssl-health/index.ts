import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

function adminDb() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function scanDomain(domain: string) {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
  const result: Record<string, any> = { domain: clean, scanned_at: new Date().toISOString() }

  // CT log check via crt.sh
  try {
    const r = await fetch(`https://crt.sh/?q=${encodeURIComponent(clean)}&output=json`, { signal: AbortSignal.timeout(8000) })
    const certs = await r.json()
    if (Array.isArray(certs) && certs.length > 0) {
      const active = certs.sort((a: any, b: any) => new Date(b.not_before).getTime() - new Date(a.not_before).getTime())
      const latest = active[0]
      const expiry = new Date(latest.not_after)
      const daysLeft = Math.floor((expiry.getTime() - Date.now()) / 86400000)
      result.cert_valid   = daysLeft > 0
      result.expiry_days  = daysLeft
      result.expiry_date  = latest.not_after?.split('T')[0]
      result.issuer       = latest.issuer_name
      result.grade        = daysLeft < 0 ? 'F' : daysLeft < 14 ? 'C' : daysLeft < 30 ? 'B' : 'A'
    } else {
      result.cert_valid = false; result.grade = 'F'; result.error = 'No certificate found'
    }
  } catch (e: any) { result.cert_valid = false; result.grade = 'F'; result.error = e.message }

  // HSTS
  try {
    const r = await fetch(`https://${clean}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) })
    result.hsts = r.headers.has('strict-transport-security')
    result.https_reachable = r.status < 500
  } catch { result.hsts = false; result.https_reachable = false }

  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json()
    const { action, domains, username } = body

    // Bulk scan (no auth needed — public tool)
    if (action === 'bulk_scan') {
      if (!Array.isArray(domains) || domains.length === 0) return json({ error: 'domains array required' }, 400)
      const limited = domains.slice(0, 10) // cap at 10 for free tier
      const results = await Promise.all(limited.map(scanDomain))
      return json({ ok: true, results })
    }

    // Public status page for a username
    if (action === 'public_status') {
      if (!username) return json({ error: 'username required' }, 400)
      const db = adminDb()
      const { data: profile } = await db.from('profiles').select('id, display_name, public_status_enabled').eq('username', username).single()
      if (!profile || !profile.public_status_enabled) return json({ error: 'Status page not found or not public' }, 404)

      const { data: certs } = await db.from('certificates').select('domain, expires_at, status').eq('user_id', profile.id).eq('status', 'active').limit(20)
      const scores = await Promise.all((certs || []).map(async (c: any) => {
        const r = await scanDomain(c.domain).catch(() => ({ domain: c.domain, cert_valid: false, grade: 'F' }))
        return r
      }))
      return json({ ok: true, display_name: profile.display_name || username, scores })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
})
