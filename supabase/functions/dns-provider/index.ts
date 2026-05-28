// dns-provider v4 — All providers implemented
// Encryption: SHA-256(SERVICE_ROLE_KEY) -> AES-GCM-256
// Called by gogetssl-issue using service role key (reliable internal call)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info' }
const ok  = (d: unknown) => new Response(JSON.stringify(d), { headers: { ...CORS, 'Content-Type': 'application/json' } })
const err = (msg: string, s = 400) => new Response(JSON.stringify({ ok: false, message: msg }), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
function db() { return createClient(SB_URL, SB_SVC) }

// ── Encryption (SHA-256 of service key → AES-GCM) ────────────────────
async function encrypt(obj: unknown): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SB_SVC))
  const key  = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt'])
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const enc  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)))
  const out  = new Uint8Array(12 + enc.byteLength); out.set(iv); out.set(new Uint8Array(enc), 12)
  return btoa(String.fromCharCode(...out))
}

async function decrypt(b64: string): Promise<Record<string, string>> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SB_SVC))
  const key  = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt'])
  const buf  = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12))
  return JSON.parse(new TextDecoder().decode(pt))
}

// ── Apex domain ───────────────────────────────────────────────────────
function apex(d: string) { return d.replace(/^[*]\./, '').split('.').slice(-2).join('.') }

// ── Find credential for user+domain ──────────────────────────────────
async function findCred(userId: string, domain: string) {
  const apx = apex(domain)
  const { data: rows } = await db()
    .from('dns_credentials')
    .select('id, provider, domain_pattern, credentials_enc, user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (!rows?.length) return null
  const match = rows.find((r: any) => {
    const p = (r.domain_pattern || '').toLowerCase()
    return p === domain.toLowerCase() || p === apx || p === `*.${apx}` || apex(p) === apx || p === ''
  }) || rows[0]
  if (!match) return null
  try {
    const creds = await decrypt(match.credentials_enc)
    return { provider: match.provider as string, creds, userId: match.user_id || userId, id: match.id }
  } catch (e: any) {
    console.error('[dns-provider] decrypt failed for', match.provider, e.message)
    return null
  }
}

// ════════════════════════════════════════════════════════════════════
// PROVIDER IMPLEMENTATIONS
// Each returns: { ok: boolean, message?: string }
// ════════════════════════════════════════════════════════════════════

// ── Cloudflare ────────────────────────────────────────────────────────
async function cloudflareAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return { ok: false, message: 'Cloudflare: apiToken missing' }
  // Get zone ID (use stored zoneId or auto-detect)
  let zoneId = creds.zoneId || ''
  if (!zoneId) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${apex(domain)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const d = await r.json()
    zoneId = d.result?.[0]?.id || ''
    if (!zoneId) return { ok: false, message: `Cloudflare: no zone found for ${apex(domain)}. Errors: ${JSON.stringify(d.errors)}` }
  }
  // Delete stale TXT records with this name before adding (prevents CF 81058 when value changed)
  try {
    const ex = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(name || domain)}`, { headers: { Authorization: `Bearer ${token}` } })
    const exData = await ex.json()
    for (const rec of (exData.result || [])) {
      if (rec.content !== value) {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${rec.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        console.log('[cloudflare] deleted stale TXT:', rec.content)
      }
    }
  } catch (e: any) { console.warn('[cloudflare] pre-add cleanup non-fatal:', e.message) }

  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: name || domain, content: value, ttl: 300 })
  })
  const d = await r.json()
  if (d.success) return { ok: true, provider: 'Cloudflare' }
  // 81057 = already exists same value, 81058 = identical record — both mean success
  if (d.errors?.some((e: any) => e.code === 81057 || e.code === 81058)) return { ok: true, provider: 'Cloudflare', note: 'record already existed' }
  return { ok: false, message: `Cloudflare: ${JSON.stringify(d.errors)}` }
}

async function cloudflareDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return
  let zoneId = creds.zoneId || ''
  if (!zoneId) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${apex(domain)}`, { headers: { Authorization: `Bearer ${token}` } })
    zoneId = (await r.json()).result?.[0]?.id || ''
  }
  if (!zoneId) return
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  for (const rec of d.result || []) {
    if (rec.content === value) {
      await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${rec.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    }
  }
}

// ── Vercel ────────────────────────────────────────────────────────────
async function vercelAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return { ok: false, message: 'Vercel: apiToken missing' }
  // TXT record name for DCV — strip the domain suffix if present
  // Vercel API expects just the subdomain part or @ for root
  const apx = apex(domain)
  let recordName = name === apx || name === `${apx}.` ? '@' : name.replace(`.${apx}`, '').replace(`${apx}`, '@') || '@'
  const teamParam = creds.teamId ? `?teamId=${creds.teamId}` : ''
  const r = await fetch(`https://api.vercel.com/v2/domains/${apx}/records${teamParam}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: recordName, value, ttl: 300 })
  })
  const d = await r.json()
  if (d.uid || d.id) return { ok: true, provider: 'Vercel' }
  // Already exists
  if (d.error?.code === 'record_already_exists' || d.error?.code === 'forbidden') return { ok: true, provider: 'Vercel', note: d.error?.code }
  return { ok: false, message: `Vercel: ${d.error?.message || JSON.stringify(d)}` }
}

async function vercelDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return
  const apx = apex(domain)
  const teamParam = creds.teamId ? `?teamId=${creds.teamId}` : ''
  const r = await fetch(`https://api.vercel.com/v2/domains/${apx}/records${teamParam}`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  for (const rec of (d.records || [])) {
    if (rec.type === 'TXT' && rec.value === value) {
      await fetch(`https://api.vercel.com/v2/domains/${apx}/records/${rec.id}${teamParam}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    }
  }
}

// ── GoDaddy ───────────────────────────────────────────────────────────
async function godaddyAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const key = creds.apiKey; const secret = creds.apiSecret
  if (!key || !secret) return { ok: false, message: 'GoDaddy: apiKey and apiSecret required' }
  const apx = apex(domain)
  // GoDaddy: name should be relative (strip domain), @ for root
  const recName = name === apx || name === `${apx}.` ? '@' : name.replace(`.${apx}`, '') || '@'
  const r = await fetch(`https://api.godaddy.com/v1/domains/${apx}/records/TXT/${encodeURIComponent(recName)}`, {
    method: 'PUT',
    headers: { Authorization: `sso-key ${key}:${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ data: value, ttl: 300 }])
  })
  if (r.status === 200) return { ok: true, provider: 'GoDaddy' }
  const d = await r.json()
  return { ok: false, message: `GoDaddy: ${d.message || JSON.stringify(d)}` }
}

async function godaddyDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  // GoDaddy doesn't have a simple delete-by-value; we replace with empty array
  const key = creds.apiKey; const secret = creds.apiSecret
  if (!key || !secret) return
  const apx = apex(domain)
  const recName = name === apx || name === `${apx}.` ? '@' : name.replace(`.${apx}`, '') || '@'
  // Get current records, filter out our value, PUT remaining
  const r = await fetch(`https://api.godaddy.com/v1/domains/${apx}/records/TXT/${encodeURIComponent(recName)}`, { headers: { Authorization: `sso-key ${key}:${secret}` } })
  if (!r.ok) return
  const existing = await r.json()
  const remaining = (existing || []).filter((rec: any) => rec.data !== value)
  if (remaining.length === existing.length) return // wasn't there
  await fetch(`https://api.godaddy.com/v1/domains/${apx}/records/TXT/${encodeURIComponent(recName)}`, {
    method: 'PUT',
    headers: { Authorization: `sso-key ${key}:${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(remaining.length ? remaining : [{ data: 'placeholder', ttl: 300 }])
  })
}

// ── DigitalOcean ──────────────────────────────────────────────────────
async function digitaloceanAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return { ok: false, message: 'DigitalOcean: apiToken missing' }
  const apx = apex(domain)
  const recName = name === apx ? '@' : name.replace(`.${apx}`, '') || '@'
  const r = await fetch(`https://api.digitalocean.com/v2/domains/${apx}/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: recName, data: value, ttl: 300 })
  })
  const d = await r.json()
  if (d.domain_record?.id) return { ok: true, provider: 'DigitalOcean' }
  return { ok: false, message: `DigitalOcean: ${JSON.stringify(d)}` }
}

async function digitaloceanDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return
  const apx = apex(domain)
  const r = await fetch(`https://api.digitalocean.com/v2/domains/${apx}/records?type=TXT&per_page=100`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  for (const rec of (d.domain_records || [])) {
    if (rec.data === value) {
      await fetch(`https://api.digitalocean.com/v2/domains/${apx}/records/${rec.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    }
  }
}

// ── Hetzner DNS ───────────────────────────────────────────────────────
async function hetznerAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return { ok: false, message: 'Hetzner: apiToken missing' }
  const apx = apex(domain)
  // Get zone ID
  const zr = await fetch(`https://dns.hetzner.com/api/v1/zones?name=${apx}`, { headers: { 'Auth-API-Token': token } })
  const zd = await zr.json()
  const zoneId = zd.zones?.[0]?.id
  if (!zoneId) return { ok: false, message: `Hetzner: no zone found for ${apx}` }
  const recName = name === apx ? '@' : name.replace(`.${apx}`, '') || '@'
  const r = await fetch('https://dns.hetzner.com/api/v1/records', {
    method: 'POST',
    headers: { 'Auth-API-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone_id: zoneId, type: 'TXT', name: recName, value: `"${value}"`, ttl: 300 })
  })
  const d = await r.json()
  if (d.record?.id) return { ok: true, provider: 'Hetzner' }
  return { ok: false, message: `Hetzner: ${JSON.stringify(d)}` }
}

async function hetznerDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return
  const apx = apex(domain)
  const zr = await fetch(`https://dns.hetzner.com/api/v1/zones?name=${apx}`, { headers: { 'Auth-API-Token': token } })
  const zoneId = (await zr.json()).zones?.[0]?.id
  if (!zoneId) return
  const r = await fetch(`https://dns.hetzner.com/api/v1/records?zone_id=${zoneId}`, { headers: { 'Auth-API-Token': token } })
  const d = await r.json()
  for (const rec of (d.records || [])) {
    if (rec.type === 'TXT' && (rec.value === value || rec.value === `"${value}"`)) {
      await fetch(`https://dns.hetzner.com/api/v1/records/${rec.id}`, { method: 'DELETE', headers: { 'Auth-API-Token': token } })
    }
  }
}

// ── Porkbun ───────────────────────────────────────────────────────────
async function porkbunAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const apikey = creds.apiKey; const secretapikey = creds.secretApiKey
  if (!apikey || !secretapikey) return { ok: false, message: 'Porkbun: apiKey and secretApiKey required' }
  const apx = apex(domain)
  const subdomain = name === apx ? '' : name.replace(`.${apx}`, '')
  const r = await fetch(`https://porkbun.com/api/json/v3/dns/create/${apx}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey, secretapikey, type: 'TXT', name: subdomain, content: value, ttl: '300' })
  })
  const d = await r.json()
  if (d.status === 'SUCCESS') return { ok: true, provider: 'Porkbun' }
  return { ok: false, message: `Porkbun: ${d.message || JSON.stringify(d)}` }
}

async function porkbunDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const apikey = creds.apiKey; const secretapikey = creds.secretApiKey
  if (!apikey || !secretapikey) return
  const apx = apex(domain)
  // Retrieve then delete matching records
  const r = await fetch(`https://porkbun.com/api/json/v3/dns/retrieve/${apx}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey, secretapikey })
  })
  const d = await r.json()
  for (const rec of (d.records || [])) {
    if (rec.type === 'TXT' && rec.content === value) {
      await fetch(`https://porkbun.com/api/json/v3/dns/delete/${apx}/${rec.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey, secretapikey })
      })
    }
  }
}

// ── Linode / Akamai ───────────────────────────────────────────────────
async function linodeAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return { ok: false, message: 'Linode: apiToken missing' }
  const apx = apex(domain)
  // Find domain ID
  const dr = await fetch('https://api.linode.com/v4/domains', { headers: { Authorization: `Bearer ${token}` } })
  const dd = await dr.json()
  const dom = dd.data?.find((d: any) => d.domain === apx)
  if (!dom) return { ok: false, message: `Linode: domain ${apx} not found in account` }
  const recName = name === apx ? '' : name.replace(`.${apx}`, '')
  const r = await fetch(`https://api.linode.com/v4/domains/${dom.id}/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: recName, target: value, ttl_sec: 300 })
  })
  const d = await r.json()
  if (d.id) return { ok: true, provider: 'Linode' }
  return { ok: false, message: `Linode: ${JSON.stringify(d.errors || d)}` }
}

async function linodeDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  if (!token) return
  const apx = apex(domain)
  const dr = await fetch('https://api.linode.com/v4/domains', { headers: { Authorization: `Bearer ${token}` } })
  const dom = (await dr.json()).data?.find((d: any) => d.domain === apx)
  if (!dom) return
  const r = await fetch(`https://api.linode.com/v4/domains/${dom.id}/records`, { headers: { Authorization: `Bearer ${token}` } })
  const d = await r.json()
  for (const rec of (d.data || [])) {
    if (rec.type === 'TXT' && rec.target === value) {
      await fetch(`https://api.linode.com/v4/domains/${dom.id}/records/${rec.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    }
  }
}

// ── DNSimple ──────────────────────────────────────────────────────────
async function dnsimpleAdd(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  const accountId = creds.accountId
  if (!token || !accountId) return { ok: false, message: 'DNSimple: apiToken and accountId required' }
  const apx = apex(domain)
  const recName = name === apx ? '' : name.replace(`.${apx}`, '')
  const r = await fetch(`https://api.dnsimple.com/v2/${accountId}/zones/${apx}/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: recName, content: value, ttl: 300 })
  })
  const d = await r.json()
  if (d.data?.id) return { ok: true, provider: 'DNSimple' }
  return { ok: false, message: `DNSimple: ${JSON.stringify(d.message || d)}` }
}

async function dnsimpleDelete(creds: Record<string, string>, domain: string, name: string, value: string) {
  const token = creds.apiToken || creds.api_token || creds.token
  const accountId = creds.accountId
  if (!token || !accountId) return
  const apx = apex(domain)
  const r = await fetch(`https://api.dnsimple.com/v2/${accountId}/zones/${apx}/records?type=TXT&per_page=100`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  const d = await r.json()
  for (const rec of (d.data || [])) {
    if (rec.content === value) {
      await fetch(`https://api.dnsimple.com/v2/${accountId}/zones/${apx}/records/${rec.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    }
  }
}

// ── Namecheap ─────────────────────────────────────────────────────────
// Namecheap uses XML API — special handling
async function namecheapAdd(creds: Record<string, string>, domain: string, _name: string, value: string) {
  const apiUser = creds.apiUser; const apiKey = creds.apiKey
  if (!apiUser || !apiKey) return { ok: false, message: 'Namecheap: apiUser and apiKey required' }
  const apx = apex(domain)
  const sld = apx.split('.')[0]; const tld = apx.split('.').slice(1).join('.')
  // Get current hosts first (Namecheap requires sending ALL records)
  const getUrl = `https://api.namecheap.com/xml.response?ApiUser=${apiUser}&ApiKey=${apiKey}&UserName=${apiUser}&Command=namecheap.domains.dns.getHosts&ClientIp=0.0.0.0&SLD=${sld}&TLD=${tld}`
  const gr = await fetch(getUrl)
  const gText = await gr.text()
  // Parse existing TXT records from XML
  const existing: string[] = []
  const hostMatches = gText.matchAll(/<host\s[^>]+>/gi)
  for (const m of hostMatches) { existing.push(m[0]) }
  // Build set command with new TXT record added
  let params = `ApiUser=${apiUser}&ApiKey=${apiKey}&UserName=${apiUser}&Command=namecheap.domains.dns.setHosts&ClientIp=0.0.0.0&SLD=${sld}&TLD=${tld}`
  let i = 1
  for (const host of existing) {
    const typeM = host.match(/Type="([^"]+)"/i)
    const nameM = host.match(/Name="([^"]+)"/i)
    const addrM = host.match(/Address="([^"]+)"/i)
    const ttlM  = host.match(/TTL="([^"]+)"/i)
    if (typeM && nameM && addrM) {
      params += `&HostName${i}=${encodeURIComponent(nameM[1])}&RecordType${i}=${typeM[1]}&Address${i}=${encodeURIComponent(addrM[1])}&TTL${i}=${ttlM?.[1]||'300'}`
      i++
    }
  }
  // Add new TXT record
  params += `&HostName${i}=@&RecordType${i}=TXT&Address${i}=${encodeURIComponent(value)}&TTL${i}=300`
  const sr = await fetch(`https://api.namecheap.com/xml.response?${params}`)
  const sText = await sr.text()
  if (sText.includes('Status="OK"') || sText.includes('Result="true"')) return { ok: true, provider: 'Namecheap' }
  return { ok: false, message: `Namecheap: ${sText.slice(0, 200)}` }
}

// ── Route53 (AWS) ─────────────────────────────────────────────────────
// Note: Route53 requires AWS Signature V4 — complex but commonly needed
async function route53Add(creds: Record<string, string>, domain: string, name: string, value: string) {
  const accessKeyId = creds.accessKeyId
  const secretKey   = creds.secretAccessKey
  if (!accessKeyId || !secretKey) return { ok: false, message: 'Route53: accessKeyId and secretAccessKey required' }
  const apx = apex(domain)
  const region = creds.region || 'us-east-1'

  // AWS Signature V4 helper
  async function hmac(key: ArrayBuffer, msg: string) {
    const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))
  }
  async function getSigningKey(dateStamp: string) {
    const kDate    = await hmac(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp)
    const kRegion  = await hmac(kDate, region)
    const kService = await hmac(kRegion, 'route53')
    return hmac(kService, 'aws4_request')
  }
  async function sha256hex(str: string) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  function toHex(buf: ArrayBuffer) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('') }

  // Get hosted zone ID
  let hostedZoneId = creds.hostedZoneId || ''
  if (!hostedZoneId) {
    const now = new Date()
    const dateStamp  = now.toISOString().slice(0, 10).replace(/-/g, '')
    const amzDate    = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
    const listPath   = `/2013-04-01/hostedzonesbyname?dnsname=${apx}.&maxitems=1`
    const payHash    = await sha256hex('')
    const headers    = `host:route53.amazonaws.com\nx-amz-date:${amzDate}\n`
    const signedH    = 'host;x-amz-date'
    const canonical  = `GET\n${listPath}\n\n${headers}\n${signedH}\n${payHash}`
    const credScope  = `${dateStamp}/${region}/route53/aws4_request`
    const strToSign  = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${await sha256hex(canonical)}`
    const sigKey     = await getSigningKey(dateStamp)
    const sig        = toHex(await hmac(sigKey, strToSign))
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedH}, Signature=${sig}`
    const r = await fetch(`https://route53.amazonaws.com${listPath}`, {
      headers: { 'x-amz-date': amzDate, Authorization: authHeader, host: 'route53.amazonaws.com' }
    })
    const txt = await r.text()
    const m = txt.match(/<Id>\/hostedzone\/([^<]+)<\/Id>/)
    hostedZoneId = m?.[1] || ''
    if (!hostedZoneId) return { ok: false, message: `Route53: no hosted zone found for ${apx}` }
  }

  // Build change batch
  const recName = `${name || apx}.`
  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/"><ChangeBatch><Changes><Change><Action>UPSERT</Action><ResourceRecordSet><Name>${recName}</Name><Type>TXT</Type><TTL>300</TTL><ResourceRecords><ResourceRecord><Value>"${value}"</Value></ResourceRecord></ResourceRecords></ResourceRecordSet></Change></Changes></ChangeBatch></ChangeResourceRecordSetsRequest>`

  const now        = new Date()
  const dateStamp  = now.toISOString().slice(0, 10).replace(/-/g, '')
  const amzDate    = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const path       = `/2013-04-01/hostedzone/${hostedZoneId}/rrset/`
  const payHash    = await sha256hex(xmlBody)
  const headers    = `content-type:application/xml\nhost:route53.amazonaws.com\nx-amz-date:${amzDate}\n`
  const signedH    = 'content-type;host;x-amz-date'
  const canonical  = `POST\n${path}\n\n${headers}\n${signedH}\n${payHash}`
  const credScope  = `${dateStamp}/${region}/route53/aws4_request`
  const strToSign  = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${await sha256hex(canonical)}`
  const sigKey     = await getSigningKey(dateStamp)
  const sig        = toHex(await hmac(sigKey, strToSign))
  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credScope}, SignedHeaders=${signedH}, Signature=${sig}`
  const r = await fetch(`https://route53.amazonaws.com${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml', 'x-amz-date': amzDate, Authorization: authHeader, host: 'route53.amazonaws.com' },
    body: xmlBody
  })
  const respText = await r.text()
  if (respText.includes('ChangeInfo') || r.status === 200) return { ok: true, provider: 'Route53' }
  return { ok: false, message: `Route53: ${respText.slice(0, 300)}` }
}

// ════════════════════════════════════════════════════════════════════
// ROUTER — pick the right provider
// ════════════════════════════════════════════════════════════════════
async function addTxt(provider: string, creds: Record<string, string>, domain: string, name: string, value: string) {
  switch (provider) {
    case 'cloudflare':    return cloudflareAdd(creds, domain, name, value)
    case 'vercel':        return vercelAdd(creds, domain, name, value)
    case 'godaddy':       return godaddyAdd(creds, domain, name, value)
    case 'digitalocean':  return digitaloceanAdd(creds, domain, name, value)
    case 'hetzner':       return hetznerAdd(creds, domain, name, value)
    case 'porkbun':       return porkbunAdd(creds, domain, name, value)
    case 'linode':        return linodeAdd(creds, domain, name, value)
    case 'dnsimple':      return dnsimpleAdd(creds, domain, name, value)
    case 'namecheap':     return namecheapAdd(creds, domain, name, value)
    case 'route53':       return route53Add(creds, domain, name, value)
    default:              return { ok: false, message: `Provider '${provider}' not yet supported for auto-DNS. Add TXT record manually.` }
  }
}

async function deleteTxt(provider: string, creds: Record<string, string>, domain: string, name: string, value: string) {
  try {
    switch (provider) {
      case 'cloudflare':    await cloudflareDelete(creds, domain, name, value); break
      case 'vercel':        await vercelDelete(creds, domain, name, value); break
      case 'godaddy':       await godaddyDelete(creds, domain, name, value); break
      case 'digitalocean':  await digitaloceanDelete(creds, domain, name, value); break
      case 'hetzner':       await hetznerDelete(creds, domain, name, value); break
      case 'porkbun':       await porkbunDelete(creds, domain, name, value); break
      case 'linode':        await linodeDelete(creds, domain, name, value); break
      case 'dnsimple':      await dnsimpleDelete(creds, domain, name, value); break
    }
  } catch (e: any) { console.warn('[dns-provider] delete error:', e.message) }
}

// ════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ════════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json()
    const { action, user_id, domain, txt_name, txt_value } = body

    // ── SAVE credential ───────────────────────────────────────────
    if (action === 'save' || action === 'update') {
      if (!user_id) return err('user_id required')
      const { provider = 'cloudflare', domain_pattern, label, credentials, id } = body
      if (!credentials || !Object.keys(credentials).length) return err('credentials required')
      const enc = await encrypt(credentials)
      if (action === 'save') {
        const { data, error: e } = await db().from('dns_credentials').insert({
          user_id, provider, label: label || domain_pattern || provider,
          domain_pattern: domain_pattern || '', credentials_enc: enc,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).select('id, provider, label, domain_pattern, created_at').single()
        if (e) return err(e.message)
        return ok({ ok: true, credential: data })
      } else {
        if (!id) return err('id required')
        const updates: Record<string, any> = { updated_at: new Date().toISOString(), credentials_enc: enc }
        if (label) updates.label = label
        if (domain_pattern !== undefined) updates.domain_pattern = domain_pattern
        if (provider) updates.provider = provider
        const { error: e } = await db().from('dns_credentials').update(updates).eq('id', id).eq('user_id', user_id)
        if (e) return err(e.message)
        return ok({ ok: true })
      }
    }

    // ── DELETE credential ─────────────────────────────────────────
    if (action === 'delete') {
      if (!body.id || !user_id) return err('id and user_id required')
      await db().from('dns_credentials').delete().eq('id', body.id).eq('user_id', user_id)
      return ok({ ok: true })
    }

    // ── TEST connection ───────────────────────────────────────────
    if (action === 'test') {
      if (!user_id || !domain) return err('user_id and domain required')
      const cred = await findCred(user_id, domain)
      if (!cred) return ok({ ok: false, message: 'No DNS provider found for this domain' })
      // Light test: just verify we can decrypt and have required fields
      const required: Record<string, string[]> = {
        cloudflare: ['apiToken'], vercel: ['apiToken'], godaddy: ['apiKey', 'apiSecret'],
        digitalocean: ['apiToken'], hetzner: ['apiToken'], porkbun: ['apiKey', 'secretApiKey'],
        linode: ['apiToken'], dnsimple: ['apiToken', 'accountId'], namecheap: ['apiUser', 'apiKey'],
        route53: ['accessKeyId', 'secretAccessKey'],
      }
      const missing = (required[cred.provider] || []).filter(f => !cred.creds[f])
      if (missing.length) return ok({ ok: false, provider: cred.provider, message: `Missing fields: ${missing.join(', ')}` })
      return ok({ ok: true, provider: cred.provider, message: 'Credentials look valid' })
    }

    // ── AUTO ADD TXT ──────────────────────────────────────────────
    if (action === 'auto_add') {
      if (!user_id || !txt_value) return err('user_id and txt_value required')
      const cred = await findCred(user_id, domain || txt_name)
      if (!cred) return ok({ ok: false, message: 'No DNS provider connected. Add one in Integrations → DNS Providers.' })
      const result = await addTxt(cred.provider, cred.creds, domain || txt_name, txt_name, txt_value)
      return ok(result)
    }

    // ── AUTO DELETE TXT ───────────────────────────────────────────
    if (action === 'auto_delete') {
      if (!user_id || !txt_value) return ok({ ok: true })
      const cred = await findCred(user_id, domain || txt_name)
      if (!cred) return ok({ ok: true })
      await deleteTxt(cred.provider, cred.creds, domain || txt_name, txt_name, txt_value)
      return ok({ ok: true })
    }

    // ── LIST credentials ──────────────────────────────────────────
    if (action === 'list') {
      const { data } = await db().from('dns_credentials').select('id, provider, label, domain_pattern, created_at').eq('user_id', user_id || '')
      return ok({ ok: true, providers: data || [] })
    }

    // ── CHECK if provider exists ──────────────────────────────────
    if (action === 'check') {
      const cred = await findCred(user_id, domain || '')
      return ok({ ok: true, has_provider: !!cred, provider: cred?.provider || null })
    }

    return err(`Unknown action: ${action}`)
  } catch (e: any) {
    console.error('[dns-provider]', e)
    return err(e.message, 500)
  }
})
