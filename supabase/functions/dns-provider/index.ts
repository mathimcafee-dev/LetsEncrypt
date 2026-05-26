import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

function adminDb() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function getCloudflareToken(userId: string): Promise<{ token: string; zone_id?: string } | null> {
  const { data } = await adminDb().from('dns_providers').select('api_token, zone_id').eq('user_id', userId).eq('provider', 'cloudflare').eq('active', true).single()
  return data ? { token: data.api_token, zone_id: data.zone_id } : null
}

async function cfAddTxtRecord(token: string, zoneId: string, name: string, value: string): Promise<boolean> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name, content: value, ttl: 300 }),
  })
  const d = await r.json()
  return d.success === true
}

async function cfGetZoneForDomain(token: string, domain: string): Promise<string | null> {
  const apex = domain.replace(/^\*\./, '').split('.').slice(-2).join('.')
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${apex}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const d = await r.json()
  return d.result?.[0]?.id || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const body = await req.json()
    const { action, user_id, domain, txt_name, txt_value } = body

    if (action === 'auto_add') {
      if (!user_id || !txt_value) return json({ ok: false, message: 'user_id and txt_value required' }, 400)

      // Try Cloudflare
      const cf = await getCloudflareToken(user_id)
      if (!cf) return json({ ok: false, message: 'No DNS provider connected. Add a DNS provider in Integrations.' })

      let zoneId = cf.zone_id
      if (!zoneId) {
        zoneId = await cfGetZoneForDomain(cf.token, domain || txt_name)
        if (!zoneId) return json({ ok: false, message: 'Could not find Cloudflare zone for this domain. Check domain is in your Cloudflare account.' })
      }

      const recordName = txt_name || domain
      const ok = await cfAddTxtRecord(cf.token, zoneId, recordName, txt_value)
      if (!ok) return json({ ok: false, message: 'Cloudflare API rejected the DNS record. Check your API token has DNS:Edit permission.' })

      return json({ ok: true, provider: 'Cloudflare', record_name: recordName, record_value: txt_value })
    }

    if (action === 'list') {
      const db = adminDb()
      const { data } = await db.from('dns_providers').select('id, provider, zone_id, active, created_at').eq('user_id', user_id || '')
      return json({ ok: true, providers: data || [] })
    }

    return json({ ok: false, message: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    return json({ ok: false, message: e.message }, 500)
  }
})
