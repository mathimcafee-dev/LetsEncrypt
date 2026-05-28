// dns-provider v2 — Auto-add DNS TXT records for DCV
// Reads from dns_credentials table (credentials_enc = AES-GCM encrypted JSON)
// Supports: Cloudflare, Vercel (extensible)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MASTER_KEY  = Deno.env.get('KEYLOCKER_MASTER_SECRET') || ''

function adminDb() { return createClient(SB_URL, SB_SERVICE) }

// ── AES-GCM decrypt (same scheme as cpanel-install / keylocker) ───────
// Key = PBKDF2(MASTER_KEY + userId, salt=userId, 100k, SHA-256) → AES-256-GCM
// Ciphertext = base64(iv[12] || ciphertext)
async function decryptCred(encrypted: string, userId: string): Promise<string> {
  if (!MASTER_KEY) throw new Error('KEYLOCKER_MASTER_SECRET not set')
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(MASTER_KEY + userId), 'PBKDF2', false, ['deriveKey'])
  const key  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(userId), iterations: 100000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  )
  const buf  = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const iv   = buf.slice(0, 12)
  const data = buf.slice(12)
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return dec.decode(pt)
}

// ── Get apex domain from any subdomain ───────────────────────────────
function apexDomain(domain: string): string {
  return domain.replace(/^\*\./, '').split('.').slice(-2).join('.')
}

// ── Find matching DNS credential for a domain ─────────────────────────
// Matches by domain_pattern (exact apex match or wildcard *.apex)
async function findCredential(userId: string, domain: string): Promise<{ provider: string; creds: Record<string, string>; userId: string } | null> {
  const apex = apexDomain(domain)
  const { data: rows } = await adminDb()
    .from('dns_credentials')
    .select('id, provider, domain_pattern, credentials_enc, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!rows?.length) return null

  // Find best match: exact domain_pattern first, then apex match
  const match = rows.find(r => {
    const p = r.domain_pattern?.toLowerCase() || ''
    return p === domain.toLowerCase() || p === apex || p === `*.${apex}` || apex.endsWith('.' + p) || p === ''
  }) || rows[0] // fallback: first row for this user

  if (!match) return null

  let creds: Record<string, string> = {}
  try {
    const decrypted = await decryptCred(match.credentials_enc, match.user_id || userId)
    creds = JSON.parse(decrypted)
  } catch (e: any) {
    console.error('[dns-provider] decrypt failed:', e.message)
    return null
  }

  return { provider: match.provider, creds, userId: match.user_id || userId }
}

// ── Cloudflare: get zone ID for domain ───────────────────────────────
async function cfGetZoneId(token: string, domain: string): Promise<string | null> {
  const apex = apexDomain(domain)
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${apex}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const d = await r.json()
  return d.result?.[0]?.id || null
}

// ── Cloudflare: add TXT record ────────────────────────────────────────
async function cfAddTxt(token: string, zoneId: string, name: string, value: string): Promise<boolean> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name, content: value, ttl: 300 }),
  })
  const d = await r.json()
  return d.success === true
}

// ── Cloudflare: delete TXT record by name+value ───────────────────────
async function cfDeleteTxt(token: string, zoneId: string, name: string, value: string): Promise<void> {
  // List records matching name
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(name)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  const d = await r.json()
  for (const rec of d.result || []) {
    if (rec.content === value) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${rec.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json()
    const { action, user_id, domain, txt_name, txt_value } = body

    if (action === 'auto_add') {
      if (!user_id || !txt_value) return json({ ok: false, message: 'user_id and txt_value required' })

      const cred = await findCredential(user_id, domain || txt_name)
      if (!cred) return json({ ok: false, message: 'No DNS provider connected. Add one in Integrations → DNS Providers.' })

      if (cred.provider === 'cloudflare') {
        const token = cred.creds.api_token || cred.creds.token || cred.creds.cloudflare_api_token
        if (!token) return json({ ok: false, message: 'Cloudflare token not found in credentials' })

        const zoneId = await cfGetZoneId(token, domain || txt_name)
        if (!zoneId) return json({ ok: false, message: `No Cloudflare zone found for ${apexDomain(domain || txt_name)}. Is this domain in your Cloudflare account?` })

        const recordName = txt_name || domain
        const ok = await cfAddTxt(token, zoneId, recordName, txt_value)
        if (!ok) return json({ ok: false, message: 'Cloudflare rejected the DNS record. Check your API token has DNS:Edit permission.' })

        return json({ ok: true, provider: 'Cloudflare', record_name: recordName, record_value: txt_value })
      }

      return json({ ok: false, message: `Provider '${cred.provider}' auto-add not yet supported` })
    }

    if (action === 'auto_delete') {
      // Called after cert is issued to clean up DCV TXT record
      if (!user_id || !txt_value) return json({ ok: false, message: 'user_id and txt_value required' })

      const cred = await findCredential(user_id, domain || txt_name)
      if (!cred) return json({ ok: false, message: 'No DNS provider' })

      if (cred.provider === 'cloudflare') {
        const token = cred.creds.api_token || cred.creds.token || cred.creds.cloudflare_api_token
        if (!token) return json({ ok: false, message: 'No token' })

        const zoneId = await cfGetZoneId(token, domain || txt_name)
        if (zoneId) await cfDeleteTxt(token, zoneId, txt_name, txt_value)
      }
      return json({ ok: true })
    }

    if (action === 'list') {
      const { data } = await adminDb()
        .from('dns_credentials')
        .select('id, provider, label, domain_pattern, created_at')
        .eq('user_id', user_id || '')
      return json({ ok: true, providers: data || [] })
    }

    if (action === 'check') {
      // Check if a DNS provider exists for this user/domain
      const cred = await findCredential(user_id, domain || '')
      return json({ ok: true, has_provider: !!cred, provider: cred?.provider || null })
    }

    return json({ ok: false, message: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    console.error('[dns-provider]', e)
    return json({ ok: false, message: e.message }, 500)
  }
})
