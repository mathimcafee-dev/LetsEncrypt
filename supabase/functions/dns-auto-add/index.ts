// dns-auto-add — adds a DNS TXT record for RapidSSL DCV validation
// Supports: Cloudflare, Vercel, GoDaddy, DigitalOcean
// Called by BuyCertificate after GoGetSSL returns dcv txt_name / txt_value

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function adminDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ── Extract root domain (e.g. sub.example.com → example.com) ─────────
function rootDomain(domain: string): string {
  const parts = domain.replace(/^\*\./, '').split('.')
  return parts.length >= 2 ? parts.slice(-2).join('.') : domain
}

// ── Cloudflare ────────────────────────────────────────────────────────
async function addCloudflare(creds: Record<string, string>, domain: string, name: string, value: string) {
  const { apiToken, zoneId: storedZoneId } = creds
  const root = rootDomain(domain)

  // Resolve zone ID
  let zoneId = storedZoneId
  if (!zoneId) {
    const zRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${root}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })
    const zData = await zRes.json()
    zoneId = zData?.result?.[0]?.id
    if (!zoneId) throw new Error(`Cloudflare: zone not found for ${root}`)
  }

  // Add TXT record
  const body = { type: 'TXT', name, content: value, ttl: 300 }
  const rRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const rData = await rRes.json()
  if (!rData.success) throw new Error(`Cloudflare: ${rData.errors?.[0]?.message || JSON.stringify(rData.errors)}`)
  return { ok: true, provider: 'Cloudflare', record_id: rData.result?.id }
}

// ── Vercel ────────────────────────────────────────────────────────────
async function addVercel(creds: Record<string, string>, domain: string, name: string, value: string) {
  const { apiToken, teamId } = creds
  const root = rootDomain(domain)
  // Vercel record name = subdomain portion only (strip root)
  const recName = name.endsWith(`.${root}`) ? name.slice(0, -(root.length + 1)) : name

  const url = `https://api.vercel.com/v2/domains/${root}/records${teamId ? `?teamId=${teamId}` : ''}`
  const rRes = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: recName, type: 'TXT', value, ttl: 300 }),
  })
  const rData = await rRes.json()
  if (rData.error) throw new Error(`Vercel: ${rData.error.message || JSON.stringify(rData.error)}`)
  return { ok: true, provider: 'Vercel', record_id: rData.uid }
}

// ── GoDaddy ───────────────────────────────────────────────────────────
async function addGoDaddy(creds: Record<string, string>, domain: string, name: string, value: string) {
  const { apiKey, apiSecret } = creds
  const root = rootDomain(domain)
  const recName = name.endsWith(`.${root}`) ? name.slice(0, -(root.length + 1)) : name

  const url = `https://api.godaddy.com/v1/domains/${root}/records/TXT/${encodeURIComponent(recName)}`
  const rRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `sso-key ${apiKey}:${apiSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ data: value, ttl: 600 }]),
  })
  if (!rRes.ok) {
    const err = await rRes.json().catch(() => ({}))
    throw new Error(`GoDaddy: ${err.message || rRes.statusText}`)
  }
  return { ok: true, provider: 'GoDaddy' }
}

// ── DigitalOcean ──────────────────────────────────────────────────────
async function addDigitalOcean(creds: Record<string, string>, domain: string, name: string, value: string) {
  const { apiToken } = creds
  const root = rootDomain(domain)
  const recName = name.endsWith(`.${root}`) ? name.slice(0, -(root.length + 1)) : name

  const rRes = await fetch(`https://api.digitalocean.com/v2/domains/${root}/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: recName, data: value, ttl: 300 }),
  })
  const rData = await rRes.json()
  if (!rRes.ok) throw new Error(`DigitalOcean: ${rData.message || JSON.stringify(rData)}`)
  return { ok: true, provider: 'DigitalOcean', record_id: rData.domain_record?.id }
}

// ── Main ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ ok: false, message: 'Unauthorized' }, 401)

    const { domain, txt_name, txt_value } = await req.json()
    if (!domain || !txt_name || !txt_value)
      return json({ ok: false, message: 'domain, txt_name, txt_value required' }, 400)

    const root = rootDomain(domain)

    // Look up the user's connected DNS provider for this domain
    const db = adminDb()
    const { data: providers } = await db
      .from('dns_credentials')
      .select('id, provider, encrypted_config')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!providers?.length)
      return json({ ok: false, message: 'No DNS provider connected. Add one under More → DNS Providers.' })

    // Match provider to root domain — prefer exact domain match, else use first
    const match = providers.find((p: any) => {
      try {
        const cfg = typeof p.encrypted_config === 'string'
          ? JSON.parse(p.encrypted_config) : p.encrypted_config
        return cfg?.domain === root || cfg?.domains?.includes(root)
      } catch { return false }
    }) || providers[0]

    // Decrypt/read credentials via RPC
    const { data: credData, error: credErr } = await db.rpc('get_dns_credentials', { cred_id: match.id })
    if (credErr || !credData) return json({ ok: false, message: 'Could not read DNS credentials.' })

    const creds = typeof credData === 'string' ? JSON.parse(credData) : credData

    let result: { ok: boolean; provider: string; record_id?: string }
    switch (match.provider) {
      case 'cloudflare':    result = await addCloudflare(creds, root, txt_name, txt_value);   break
      case 'vercel':        result = await addVercel(creds, root, txt_name, txt_value);       break
      case 'godaddy':       result = await addGoDaddy(creds, root, txt_name, txt_value);      break
      case 'digitalocean':  result = await addDigitalOcean(creds, root, txt_name, txt_value); break
      default:
        return json({ ok: false, message: `Provider '${match.provider}' not supported for auto-add.` })
    }

    return json(result)
  } catch (e: any) {
    console.error('dns-auto-add:', e)
    return json({ ok: false, message: e.message || 'Internal error' }, 500)
  }
})
