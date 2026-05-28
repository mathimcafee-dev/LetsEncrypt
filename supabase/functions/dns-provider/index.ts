// dns-provider v3
// Encryption: SHA-256(SERVICE_ROLE_KEY) -> AES-GCM-256 (same as server-credentials)
// Table: dns_credentials (credentials_enc = base64(iv[12] + ciphertext))

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function adminDb() { return createClient(SB_URL, SB_SERVICE) }

// SHA-256(SB_SERVICE) → AES-GCM-256. base64(iv[12] + ciphertext)
async function encrypt(obj: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SB_SERVICE))
  const key  = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt'])
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const enc  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)))
  const out  = new Uint8Array(12 + enc.byteLength)
  out.set(iv, 0); out.set(new Uint8Array(enc), 12)
  return btoa(String.fromCharCode(...out))
}

async function decrypt(b64: string): Promise<Record<string, string>> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SB_SERVICE))
  const key  = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt'])
  const buf  = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12))
  return JSON.parse(new TextDecoder().decode(pt))
}

function apexDomain(domain: string): string {
  return domain.replace(/^\*\./, '').split('.').slice(-2).join('.')
}

async function findCredential(userId: string, domain: string) {
  const apex = apexDomain(domain)
  const { data: rows } = await adminDb()
    .from('dns_credentials')
    .select('id, provider, domain_pattern, credentials_enc, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!rows?.length) return null
  const match = rows.find((r: any) => {
    const p = r.domain_pattern?.toLowerCase() || ''
    return p === domain.toLowerCase() || p === apex || p === `*.${apex}` || apex.endsWith('.' + p) || p === ''
  }) || rows[0]
  if (!match) return null
  let creds: Record<string, string> = {}
  try { creds = await decrypt(match.credentials_enc) } catch (e: any) {
    console.error('[dns-provider] decrypt failed:', e.message); return null
  }
  return { provider: match.provider, creds, userId: match.user_id || userId }
}

async function cfGetZoneId(token: string, domain: string): Promise<string | null> {
  const apex = apexDomain(domain)
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${apex}`, { headers: { 'Authorization': `Bearer ${token}` } })
  const d = await r.json()
  return d.result?.[0]?.id || null
}

async function cfAddTxt(token: string, zoneId: string, name: string, value: string): Promise<boolean> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name, content: value, ttl: 300 }),
  })
  const d = await r.json()
  return d.success === true
}

async function cfDeleteTxt(token: string, zoneId: string, name: string, value: string): Promise<void> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(name)}`, { headers: { 'Authorization': `Bearer ${token}` } })
  const d = await r.json()
  for (const rec of d.result || []) {
    if (rec.content === value) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${rec.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json()
    const { action, user_id, domain, txt_name, txt_value } = body

    if (action === 'save' || action === 'update') {
      if (!user_id) return json({ ok: false, message: 'user_id required' })
      const { provider = 'cloudflare', domain_pattern, label, credentials, id } = body
      if (!credentials || !Object.keys(credentials).length) return json({ ok: false, message: 'credentials required' })
      const enc = await encrypt(credentials)
      if (action === 'save') {
        const { data, error } = await adminDb().from('dns_credentials').insert({
          user_id, provider, label: label || domain_pattern || provider,
          domain_pattern: domain_pattern || '', credentials_enc: enc,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).select('id, provider, label, domain_pattern, created_at').single()
        if (error) return json({ ok: false, message: error.message })
        return json({ ok: true, credential: data })
      } else {
        if (!id) return json({ ok: false, message: 'id required for update' })
        const updates: Record<string, any> = { updated_at: new Date().toISOString(), credentials_enc: enc }
        if (label) updates.label = label
        if (domain_pattern !== undefined) updates.domain_pattern = domain_pattern
        if (provider) updates.provider = provider
        const { error } = await adminDb().from('dns_credentials').update(updates).eq('id', id).eq('user_id', user_id)
        if (error) return json({ ok: false, message: error.message })
        return json({ ok: true })
      }
    }

    if (action === 'delete') {
      const { id } = body
      if (!id || !user_id) return json({ ok: false, message: 'id and user_id required' })
      await adminDb().from('dns_credentials').delete().eq('id', id).eq('user_id', user_id)
      return json({ ok: true })
    }

    if (action === 'test') {
      if (!user_id || !domain) return json({ ok: false, message: 'user_id and domain required' })
      const cred = await findCredential(user_id, domain)
      if (!cred) return json({ ok: false, message: 'No DNS provider found for this domain' })
      if (cred.provider === 'cloudflare') {
        const token = cred.creds.apiToken || cred.creds.api_token || cred.creds.token
        if (!token) return json({ ok: false, message: 'No token in credential' })
        const zoneId = await cfGetZoneId(token, domain)
        return json({ ok: !!zoneId, provider: 'Cloudflare', zone_found: !!zoneId, message: zoneId ? 'Connected — zone found' : 'Zone not found for this domain' })
      }
      return json({ ok: true, provider: cred.provider, message: 'Credential found' })
    }

    if (action === 'auto_add') {
      if (!user_id || !txt_value) return json({ ok: false, message: 'user_id and txt_value required' })
      const cred = await findCredential(user_id, domain || txt_name)
      if (!cred) return json({ ok: false, message: 'No DNS provider connected. Add one in Integrations → DNS Providers.' })
      if (cred.provider === 'cloudflare') {
        const token = cred.creds.apiToken || cred.creds.api_token || cred.creds.token || cred.creds.cloudflare_api_token
        if (!token) return json({ ok: false, message: 'Cloudflare token not found in credential' })
        const zoneId = await cfGetZoneId(token, domain || txt_name)
        if (!zoneId) return json({ ok: false, message: `No Cloudflare zone found for ${apexDomain(domain || txt_name)}. Is this domain in your Cloudflare account?` })
        const recordName = txt_name || domain
        const ok = await cfAddTxt(token, zoneId, recordName, txt_value)
        if (!ok) return json({ ok: false, message: 'Cloudflare rejected the DNS record. Check DNS:Edit permission.' })
        return json({ ok: true, provider: 'Cloudflare', record_name: recordName, record_value: txt_value })
      }
      return json({ ok: false, message: `Provider '${cred.provider}' auto-add not yet supported` })
    }

    if (action === 'auto_delete') {
      if (!user_id || !txt_value) return json({ ok: true })
      const cred = await findCredential(user_id, domain || txt_name)
      if (!cred) return json({ ok: true })
      if (cred.provider === 'cloudflare') {
        const token = cred.creds.apiToken || cred.creds.api_token || cred.creds.token || cred.creds.cloudflare_api_token
        if (token) {
          const zoneId = await cfGetZoneId(token, domain || txt_name)
          if (zoneId) await cfDeleteTxt(token, zoneId, txt_name, txt_value)
        }
      }
      return json({ ok: true })
    }

    if (action === 'list') {
      const { data } = await adminDb().from('dns_credentials').select('id, provider, label, domain_pattern, created_at').eq('user_id', user_id || '')
      return json({ ok: true, providers: data || [] })
    }

    if (action === 'check') {
      const cred = await findCredential(user_id, domain || '')
      return json({ ok: true, has_provider: !!cred, provider: cred?.provider || null })
    }

    return json({ ok: false, message: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    console.error('[dns-provider]', e)
    return json({ ok: false, message: e.message }, 500)
  }
})
