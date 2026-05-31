// gogetssl-issue v3 — Clean, correct implementation
//
// FLOWS:
//   place_order  → new GGS order + new ssl_orders row + auto DNS + auto poll
//   check_status → manual GGS poll, activates cert if ready
//   poll_pending → cron: checks all dv_pending orders, activates when GGS confirms
//   reissue      → fresh CSR+key on SAME ggs_order_id, updates existing rows
//   renew        → new GGS order (new billing), new ssl_orders + certificates rows
//   get_history  → reissue + renewal history for a cert
//   get_profile  → saved contact details for a domain
//   get_products → list available RapidSSL products
//
// KEY INVARIANTS:
//   - ssl_orders: one row per GGS order_id. Reissue updates in place, never inserts.
//   - certificates: one row per GGS order_id. New order = INSERT new row. Reissue = UPDATE existing row by ggs_order_id.
//   - keylocker: new key stored on every new order AND every reissue (fresh keypair each time).
//   - After reissue/renewal activates: certificates.keylocker_key_id = new key's ID.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GGS_API = 'https://my.gogetssl.com/api'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function adminDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ── GoGetSSL API helpers ──────────────────────────────────────────────

async function getCredentials(): Promise<{ user: string; pass: string }> {
  const { data, error } = await adminDb().rpc('get_ggs_credentials')
  if (error || !data) throw new Error('Failed to read GGS credentials')
  return data
}

async function ggsAuth(): Promise<string> {
  const { user, pass } = await getCredentials()
  const res = await fetch(`${GGS_API}/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ user, pass }),
  })
  const data = await res.json()
  if (!data.key) throw new Error(`GoGetSSL auth failed: ${JSON.stringify(data)}`)
  return data.key
}

async function ggsPost(authKey: string, path: string, body: Record<string, string>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${GGS_API}${path}?auth_key=${authKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
        signal: AbortSignal.timeout(30000),
      })
      return res.json()
    } catch (e: any) {
      console.warn(`[ggs] POST ${path} attempt ${i+1}/${retries} failed:`, e.message)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)))
      else throw e
    }
  }
}

async function ggsGet(authKey: string, path: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${GGS_API}${path}?auth_key=${authKey}`, {
        signal: AbortSignal.timeout(30000),
      })
      return res.json()
    } catch (e: any) {
      console.warn(`[ggs] GET ${path} attempt ${i+1}/${retries} failed:`, e.message)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)))
      else throw e
    }
  }
}

// ── Product resolution ────────────────────────────────────────────────

const PRODUCT_META: Record<string, { wildcard: boolean }> = {
  rapidssl:          { wildcard: false },
  rapidssl_wildcard: { wildcard: true  },
}

function normaliseProducts(resp: any): Array<{ id: number; name: string; wildcard: boolean }> {
  if (!resp || typeof resp !== 'object') return []
  const getName = (p: any): string => String(p.product ?? p.name ?? p.product_name ?? p.title ?? '')
  const getWildcard = (p: any): boolean => {
    if (p.wildcard_enabled !== undefined) return Number(p.wildcard_enabled) === 1
    if (p.wildcard !== undefined) return String(p.wildcard).toLowerCase() === 'yes'
    return getName(p).toLowerCase().includes('wildcard')
  }
  let raw: any[] = []
  if (Array.isArray(resp.products)) raw = resp.products
  else if (Array.isArray(resp)) raw = resp
  else for (const [k, v] of Object.entries(resp)) {
    if (k === 'success' || !v || typeof v !== 'object') continue
    raw.push({ id: Number(k), ...(v as object) })
  }
  return raw
    .filter((p: any) => p && typeof p === 'object')
    .map((p: any) => ({ id: Number(p.id ?? p.product_id ?? 0), name: getName(p), wildcard: getWildcard(p) }))
    .filter((p: any) => p.id > 0 && p.name)
}

async function resolveProductId(authKey: string, code: string): Promise<{ id: number; name: string }> {
  const resp    = await ggsGet(authKey, '/products/ssl/')
  const entries = normaliseProducts(resp)
  if (entries.length === 0) throw new Error(`GoGetSSL /products/ssl/ returned no products. Raw: ${JSON.stringify(resp).slice(0, 300)}`)
  const isWildcard = PRODUCT_META[code]?.wildcard ?? false
  const match = entries.find(({ name, wildcard }) => {
    const n = name.toLowerCase()
    return n.includes('rapidssl') && (isWildcard ? wildcard : !wildcard)
  })
  if (!match) {
    const names = entries.map(e => `${e.id}:${e.name}(wc=${e.wildcard})`).join(', ')
    throw new Error(`RapidSSL${isWildcard ? ' Wildcard' : ''} not found. Available: ${names}`)
  }
  return { id: match.id, name: match.name }
}

// ── DCV extraction ────────────────────────────────────────────────────
// GGS returns DCV info in two shapes:
//   add_ssl_order response: top-level dcv_txt_name / dcv_txt_value
//   orders/status response: nested in .domains[domain].txt_record_name / .txt_record_value

function extractDcv(resp: any): { name: string; value: string } {
  if (!resp) return { name: '', value: '' }

  // Log raw GGS response shape so we can diagnose missing fields
  console.log('[extractDcv] keys:', Object.keys(resp).join(','), '| sample:', JSON.stringify(resp).slice(0, 400))

  // Shape 1: top-level dcv_txt_name / dcv_txt_value  (add_ssl_order response)
  const directName  = resp.dcv_txt_name  || resp.dcv_cname_name  || ''
  const directValue = resp.dcv_txt_value || resp.dcv_cname_value || ''
  if (directValue) return { name: directName, value: directValue }

  // Shape 2: top-level dns_txt_* / txt_* variants
  const dns2Value = resp.dns_txt_value || resp.txt_value || resp.txt_record || ''
  const dns2Name  = resp.dns_txt_name  || resp.txt_name  || ''
  if (dns2Value) return { name: dns2Name, value: dns2Value }

  // Shape 3: top-level validation object
  if (resp.validation && typeof resp.validation === 'object') {
    const v = resp.validation
    const vValue = v.dcv_txt_value || v.dns_txt_value || v.txt_value || v.txt_record || v.cname_value || ''
    const vName  = v.dcv_txt_name  || v.dns_txt_name  || v.txt_name  || v.cname_name  || ''
    if (vValue) return { name: vName, value: vValue }
  }

  // Shape 4: nested domains object (orders/status response)
  if (resp.domains && typeof resp.domains === 'object') {
    const d = Object.values(resp.domains)[0] as any
    if (d) {
      console.log('[extractDcv] domains[0] keys:', Object.keys(d).join(','), '| sample:', JSON.stringify(d).slice(0, 300))
      const name  = d.txt_record_name  || d.dcv_txt_name  || d.dns_txt_name  || d.cname_name  || d.validation?.cname_name  || ''
      const value = d.txt_record_value || d.dcv_txt_value || d.dns_txt_value || d.txt_value   || d.txt_record || d.cname_value || d.validation?.cname_value || ''
      if (value) return { name, value }
    }
  }

  // Shape 5: dns_records array
  if (Array.isArray(resp.dns_records) && resp.dns_records.length > 0) {
    const r = resp.dns_records[0]
    const value = r.value || r.txt_value || r.content || ''
    const name  = r.name  || r.host || ''
    if (value) return { name, value }
  }

  // Shape 6: approver_method.dns.record (confirmed GGS format for orders/status)
  // Format: "freecerts.site.   IN   TXT   \"_u2z2z5ixp9jnz4t6bya5dfoisgxosvs\""
  if (resp.approver_method?.dns?.record) {
    const record: string = resp.approver_method.dns.record
    // Parse: "NAME.   IN   TXT   \"VALUE\""
    const txtMatch = record.match(/IN\s+TXT\s+"([^"]+)"/i)
    const nameMatch = record.match(/^([^\s]+)/)
    if (txtMatch) {
      const value = txtMatch[1]
      const name  = nameMatch ? nameMatch[1].replace(/\.$/, '') : ''
      console.log('[extractDcv] found via approver_method.dns.record:', name, value)
      return { name, value }
    }
  }

  console.warn('[extractDcv] no DCV found. Full response:', JSON.stringify(resp).slice(0, 500))
  return { name: '', value: '' }
}

// ── Auto-add DNS TXT record ────────────────────────────────────────────

// ── DNS helpers — call dns-provider using SERVICE ROLE KEY ───────────
// Using service role key (not user JWT) makes the inter-function call
// reliable — it bypasses JWT expiry and auth issues.
// dns-provider handles ALL providers: Cloudflare, Vercel, GoDaddy,
// DigitalOcean, Hetzner, Porkbun, Linode, DNSimple, Namecheap, Route53

async function autoDns(_authHeader: string, userId: string, domain: string, txtName: string, txtValue: string): Promise<void> {
  if (!txtValue) { console.warn('[dns] autoDns: empty txtValue — skipping'); return }
  try {
    const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dns-provider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Service role key — always valid, not tied to user session
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ action: 'auto_add', user_id: userId, domain, txt_name: txtName, txt_value: txtValue }),
    })
    const d = await r.json()
    if (d.ok) {
      console.log('[dns] TXT added via', d.provider || 'unknown provider', ':', txtName)
    } else {
      console.error('[dns] auto_add failed:', d.message, '— user may need to add TXT record manually')
    }
  } catch (e: any) {
    console.error('[dns] autoDns exception:', e.message)
  }
}

async function autoDeleteDns(_authHeader: string, userId: string, domain: string, txtName: string, txtValue: string): Promise<void> {
  if (!txtValue) return
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dns-provider`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ action: 'auto_delete', user_id: userId, domain, txt_name: txtName, txt_value: txtValue }),
    })
  } catch (e: any) {
    console.warn('[dns] autoDeleteDns exception:', e.message)
  }
}

// ── KeyLocker helper ──────────────────────────────────────────────────

async function callKeyLocker(authHeader: string, body: Record<string, unknown>) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/keylocker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ── RSA-2048 keypair + PKCS#10 CSR generation ─────────────────────────
// Private key NEVER leaves this function — stored only in KeyLocker

function u8ToBase64(buf: Uint8Array): string {
  let bin = ''; for (const b of buf) bin += String.fromCharCode(b); return btoa(bin)
}
function pemWrap(label: string, b64: string): string {
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)?.join('\n')}\n-----END ${label}-----\n`
}
function derLen(n: number): Uint8Array {
  if (n < 0x80) return new Uint8Array([n])
  if (n < 0x100) return new Uint8Array([0x81, n])
  return new Uint8Array([0x82, (n >> 8) & 0xff, n & 0xff])
}
function derTag(tag: number, content: Uint8Array): Uint8Array {
  return new Uint8Array([tag, ...derLen(content.length), ...content])
}
const derSeq  = (c: Uint8Array) => derTag(0x30, c)
const derSet  = (c: Uint8Array) => derTag(0x31, c)
const derCtx0 = (c: Uint8Array) => derTag(0xa0, c)
function derOidBytes(oid: number[]): Uint8Array { return new Uint8Array([0x06, oid.length, ...oid]) }
function derUtf8(str: string): Uint8Array { return derTag(0x0c, new TextEncoder().encode(str)) }
function rdn(oidBytes: number[], value: string): Uint8Array {
  return derSet(derSeq(new Uint8Array([...derOidBytes(oidBytes), ...derUtf8(value)])))
}
function buildSubject(cn: string): Uint8Array {
  return derSeq(new Uint8Array([
    ...rdn([0x55,0x04,0x03], cn),
    ...rdn([0x55,0x04,0x0a], 'SSLVault'),
    ...rdn([0x55,0x04,0x07], 'Amsterdam'),
    ...rdn([0x55,0x04,0x08], 'Noord-Holland'),
    ...rdn([0x55,0x04,0x06], 'NL'),
  ]))
}
const SHA256_WITH_RSA = new Uint8Array([0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x0b,0x05,0x00])

async function generateCSRAndKey(domain: string): Promise<{ csrPem: string; privateKeyPem: string }> {
  const kp = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([0x01,0x00,0x01]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  )
  const pkcs8Der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey))
  const privateKeyPem = pemWrap('PRIVATE KEY', u8ToBase64(pkcs8Der))
  const spkiDer = new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey))
  const tbsCSR = derSeq(new Uint8Array([
    ...new Uint8Array([0x02,0x01,0x00]),
    ...buildSubject(domain),
    ...spkiDer,
    ...derCtx0(new Uint8Array(0)),
  ]))
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, tbsCSR)
  const csrDer = derSeq(new Uint8Array([...tbsCSR, ...SHA256_WITH_RSA, ...derTag(0x03, new Uint8Array([0x00, ...new Uint8Array(sigBuf)]))]))
  return { csrPem: pemWrap('CERTIFICATE REQUEST', u8ToBase64(csrDer)), privateKeyPem }
}

// ── Subscription end date ─────────────────────────────────────────────
// GGS RapidSSL: cert validity ~6 months (197 days), but order period = 12 months.
// subscription_end_date = order placed date + period months.
// This is when renewal must happen (30 days before).

function calcSubscriptionEnd(issuedAt: string, periodMonths: number): string {
  const d = new Date(issuedAt)
  d.setMonth(d.getMonth() + periodMonths)
  return d.toISOString()
}

// ── Insert or update certificates row by ggs_order_id ────────────────
// NEW ORDER / RENEWAL → no existing row for this ggs_order_id → INSERT
// REISSUE / POLL on existing order → row exists for this ggs_order_id → UPDATE
// This ensures each GoGetSSL order has its own certificates row,
// allowing unlimited orders per domain to coexist.
async function upsertCert(ggsOrderId: number, data: Record<string, any>): Promise<string | null> {
  // Find existing cert row for this exact GGS order
  const { data: existing } = await adminDb()
    .from('certificates')
    .select('id')
    .eq('ggs_order_id', ggsOrderId)
    .eq('user_id', data.user_id)
    .single()

  if (existing) {
    // UPDATE existing row (reissue path or re-poll of same order)
    await adminDb().from('certificates').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id)
    return existing.id
  } else {
    // INSERT new row (new order or renewal)
    const { data: inserted } = await adminDb().from('certificates').insert({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select('id').single()
    return inserted?.id || null
  }
}

// ── Main handler ──────────────────────────────────────────────────────

async function runPollPending() {
// ── POLL PENDING ──────────────────────────────────────────────────
// Called by cron every 2 min. Checks all dv_pending/issued orders.
// No user auth check needed here — called with service role from cron.
  const { data: pendingOrders } = await adminDb()
    .from('ssl_orders')
    .select('id, user_id, domain, ggs_order_id, keylocker_key_id, private_key_pem, status, period, product_name, order_purpose, dcv_txt_name, dcv_txt_value')
    .in('status', ['dv_pending', 'issued'])
    .order('created_at', { ascending: true })
    .limit(30)

  if (!pendingOrders?.length) return json({ ok: true, checked: 0, activated: 0 })

  const authKey = await ggsAuth()
  let activated = 0

  for (const order of pendingOrders) {
    try {
      const statusRes = await ggsGet(authKey, `/orders/status/${order.ggs_order_id}`)

      // If still processing: ensure DCV record exists in DNS (catches missed auto-add)
      if (statusRes.status !== 'active' || !statusRes.crt_code) {
        // Pick up DCV values if we don't have them yet
        if (!order.dcv_txt_value) {
          const { name: dn, value: dv } = extractDcv(statusRes)
          if (dv) {
            await adminDb().from('ssl_orders').update({
              dcv_txt_name: dn, dcv_txt_value: dv,
              dcv_cname_name: dn, dcv_cname_value: dv,
              updated_at: new Date().toISOString(),
            }).eq('id', order.id)
            order.dcv_txt_name = dn; order.dcv_txt_value = dv
          }
        }

        if (order.dcv_txt_value) {
          // Direct CF call — no inter-function hop
          await autoDns('', order.user_id, order.domain, order.dcv_txt_name, order.dcv_txt_value)
        }
        continue
      }

      const now = new Date().toISOString()
      const keyId = order.keylocker_key_id

      // Update ssl_orders → active
      await adminDb().from('ssl_orders').update({
        status:     'active',
        crt_code:   statusRes.crt_code,
        ca_code:    statusRes.ca_code || null,
        valid_from: statusRes.valid_from || null,
        valid_till: statusRes.valid_till || null,
        cert_pem:   statusRes.crt_code,
        ca_pem:     statusRes.ca_code || null,
        updated_at: now,
      }).eq('id', order.id)

      // Insert or update certificate row by ggs_order_id
      const certData: Record<string, any> = {
        user_id:               order.user_id,
        domain:                order.domain,
        status:                'active',
        cert_pem:              statusRes.crt_code,
        ca_pem:                statusRes.ca_code || null,
        expires_at:            statusRes.valid_till || null,
        issued_at:             statusRes.valid_from || null,
        subscription_end_date: calcSubscriptionEnd(statusRes.valid_from || now, order.period || 12),
        issuer:                order.product_name || 'RapidSSL',
        cert_type:             order.product_name || 'RapidSSL DV',
        source:                'gogetssl',
        ggs_order_id:          order.ggs_order_id,
        serial_number:         statusRes.serial_number || null,
        private_key_pem:       order.private_key_pem || null,
        order_type:            order.order_purpose || 'original',
        is_current:            true,
      }
      if (keyId) certData.keylocker_key_id = keyId

      const certId = await upsertCert(order.ggs_order_id, certData)

      // Link keylocker entry → cert
      if (keyId && certId) {
        await adminDb().from('keylocker_keys').update({ cert_id: certId, expires_at: statusRes.valid_till }).eq('id', keyId)
      }

      // Complete any pending cert_reissues rows for this order
      const { data: completedReissues } = await adminDb().from('cert_reissues')
        .update({ status: 'completed', installed_at: now, expires_at: statusRes.valid_till, cert_pem: statusRes.crt_code })
        .eq('ggs_order_id', order.ggs_order_id)
        .eq('status', 'dv_pending')
        .select('id')

      // Stamp last_reissued_at + increment reissue_count so CertTimeline shows correct data
      if (completedReissues && completedReissues.length > 0 && certId) {
        const { data: existingCert } = await adminDb().from('certificates').select('reissue_count').eq('id', certId).single()
        await adminDb().from('certificates').update({
          last_reissued_at: now,
          reissue_count: ((existingCert?.reissue_count || 0) + completedReissues.length),
        }).eq('id', certId)
      }

      // Clean up DCV TXT from DNS
      if (order.dcv_txt_name && order.dcv_txt_value) {
        await autoDeleteDns('', order.user_id, order.domain, order.dcv_txt_name, order.dcv_txt_value)
      }

      // Dispatch installation job
      await dispatchInstall(order.user_id, order.domain, order.ggs_order_id, keyId)

      activated++
      console.log(`[poll_pending] Activated ${order.domain} (GGS #${order.ggs_order_id})`)
    } catch (e: any) {
      console.error(`[poll_pending] Error on ${order.domain}:`, e.message)
    }
  }

  // ── Retry install for active certs not yet live ────────────────────
  // Catches: cPanel downtime, token expiry, first attempt timing out.
  // Re-fires install for certs that are active but not installed,
  // where last attempt was >5 min ago (or never attempted).
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: retryList } = await adminDb()
      .from('certificates')
      .select('id, user_id, domain, install_method, install_server_id')
      .eq('status', 'active')
      .eq('is_live_on_server', false)
      .not('install_method', 'is', null)
      .not('install_server_id', 'is', null)
      .or(`install_pending_since.is.null,install_pending_since.lt.${fiveMinsAgo}`)
      .limit(5)
    for (const cert of (retryList || [])) {
      if (cert.install_method !== 'cpanel' || !cert.install_server_id) continue
      await adminDb().from('certificates').update({ install_pending_since: new Date().toISOString() }).eq('id', cert.id)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cpanel-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ action: 'install', cert_id: cert.id, domain: cert.domain, credential_id: cert.install_server_id, _service_user_id: cert.user_id }),
      }).catch(() => {})
      console.log('[poll] retry install for', cert.domain)
    }
  } catch (e: any) { console.warn('[poll] retry install error:', e.message) }

  return json({ ok: true, checked: pendingOrders.length, activated })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Auth — all actions require a valid user
    const authHeader = req.headers.get('Authorization') || ''
    const body = await req.json()
    const { action } = body

    // poll_pending is called by cron with service role key — allow without user JWT
    const SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (action === 'poll_pending') {
      const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (bearerToken !== SVC_KEY) return json({ error: 'Unauthorized' }, 401)
      const res = await runPollPending()
      return json(res)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // ── PLACE ORDER ───────────────────────────────────────────────────
    if (action === 'place_order') {
      const { domain, period = 12, product_code = 'rapidssl', firstName, lastName, adminEmail, phone } = body
      if (!domain) return json({ error: 'domain required' }, 400)
      if (!firstName || !lastName || !adminEmail || !phone) return json({ error: 'Contact details required' }, 400)

      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase().trim()
      const csrDomain   = PRODUCT_META[product_code]?.wildcard
        ? (cleanDomain.startsWith('*.') ? cleanDomain : `*.${cleanDomain}`)
        : cleanDomain

      // Idempotency: block if a dv_pending order already exists for this domain
      const { data: existing } = await adminDb()
        .from('ssl_orders')
        .select('id, ggs_order_id, dcv_txt_name, dcv_txt_value, status')
        .eq('user_id', user.id)
        .eq('domain', cleanDomain)
        .eq('status', 'dv_pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        // Return existing pending order's DCV info — don't place a duplicate
        return json({
          ok: true,
          order_id:     existing.id,
          ggs_order_id: existing.ggs_order_id,
          domain:       cleanDomain,
          dcv_txt_name:  existing.dcv_txt_name,
          dcv_txt_value: existing.dcv_txt_value,
          status:       'dv_pending',
          _duplicate:   true,
        })
      }

      // Generate fresh keypair + CSR
      const { csrPem, privateKeyPem } = await generateCSRAndKey(csrDomain)

      // Place order with GGS
      const authKey = await ggsAuth()
      const product = await resolveProductId(authKey, product_code)
      const orderRes = await ggsPost(authKey, '/orders/add_ssl_order/', {
        product_id:       String(product.id),
        period:           String(period),
        csr:              csrPem,
        server_count:     '-1',
        webserver_type:   '2',
        dcv_method:       'dns',
        approver_email:   `admin@${cleanDomain}`,
        admin_email:      adminEmail,
        admin_phone:      phone,
        admin_firstname:  firstName,
        admin_lastname:   lastName,
        admin_title:      'Mr',
        tech_firstname:   firstName,
        tech_lastname:    lastName,
        tech_email:       adminEmail,
        tech_phone:       phone,
        tech_title:       'Mr',
      })

      if (!orderRes.order_id)
        return json({ error: orderRes.description || orderRes.error || JSON.stringify(orderRes) }, 500)

      // Insert ssl_orders row (no private key — KeyLocker owns it)
      const now = new Date().toISOString()
      const { data: saved, error: dbErr } = await adminDb()
        .from('ssl_orders')
        .insert({
          user_id:          user.id,
          domain:           cleanDomain,
          product_id:       product.id,
          product_name:     product.name,
          product_code,
          period,
          status:           'dv_pending',
          order_purpose:    'initial',
          ggs_order_id:     orderRes.order_id,
          ggs_invoice_id:   orderRes.invoice_id,
          csr_code:         csrPem,
          private_key_pem:  null,
          admin_email:      adminEmail,
          admin_first_name: firstName,
          admin_last_name:  lastName,
          admin_phone:      phone,
          created_at:       now,
          updated_at:       now,
        })
        .select()
        .single()
      if (dbErr) return json({ error: dbErr.message }, 500)

      // Save contact profile for next order
      await adminDb().from('domain_profiles').upsert({
        user_id: user.id, domain: cleanDomain,
        first_name: firstName, last_name: lastName,
        email: adminEmail, phone, updated_at: now,
      }, { onConflict: 'user_id,domain' })

      // Store private key in KeyLocker
      const klRes = await callKeyLocker(authHeader, {
        action: 'store', private_key_pem: privateKeyPem, domain: cleanDomain,
        order_id: saved.id, ggs_order_id: orderRes.order_id,
        csr_pem: csrPem, product_name: product.name, algorithm: 'RSA', key_size: 2048,
      })
      if (klRes.ok && klRes.key_id) {
        await adminDb().from('ssl_orders').update({ keylocker_key_id: klRes.key_id }).eq('id', saved.id)
      } else {
        console.error('[place_order] KeyLocker store failed:', klRes.error)
      }

      // ONE quick DCV check after 2s. We do NOT loop/retry here —
      // Supabase edge functions have a wall-clock CPU limit and sleeping
      // 10s (5×2s) causes the function to be killed, leaving dcv_txt_value null.
      // The poll_pending cron (every 2 min) picks up DCV automatically if missed.
      // The frontend check_status loop (every 5s) also rescues it.
      let dcvName = '', dcvValue = ''
      try {
        await new Promise(r => setTimeout(r, 2000))
        const quickStatus = await ggsGet(authKey, `/orders/status/${orderRes.order_id}`)
        const fromOrder = extractDcv(orderRes)
        const fromStatus = extractDcv(quickStatus)
        dcvName = fromOrder.name || fromStatus.name
        dcvValue = fromOrder.value || fromStatus.value
        if (dcvValue) {
          await adminDb().from('ssl_orders').update({
            dcv_txt_name:    dcvName,
            dcv_txt_value:   dcvValue,
            dcv_cname_name:  dcvName,
            dcv_cname_value: dcvValue,
            ggs_status:      quickStatus.status || 'dv_pending',
            updated_at:      new Date().toISOString(),
          }).eq('id', saved.id)
          await autoDns(authHeader, user.id, cleanDomain, dcvName, dcvValue)
        } else {
          console.log('[place_order] DCV not ready after 2s — poll_pending cron will pick it up')
        }
      } catch (e: any) {
        console.warn('[place_order] quick DCV check failed (non-fatal):', e.message)
      }

      return json({
        ok:            true,
        order_id:      saved.id,
        ggs_order_id:  orderRes.order_id,
        domain:        cleanDomain,
        product_name:  product.name,
        dcv_txt_name:  dcvName,
        dcv_txt_value: dcvValue,
        status:        'dv_pending',
      })
    }

    // ── CHECK STATUS ──────────────────────────────────────────────────
    // Manual trigger: fetches GGS status for one order and activates if ready
    if (action === 'check_status') {
      const { order_id } = body
      if (!order_id) return json({ error: 'order_id required' }, 400)

      const { data: order } = await adminDb()
        .from('ssl_orders')
        .select('*')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .single()
      if (!order) return json({ error: 'Order not found' }, 404)

      const authKey   = await ggsAuth()
      const statusRes = await ggsGet(authKey, `/orders/status/${order.ggs_order_id}`)

      const upd: Record<string, any> = { ggs_status: statusRes.status, updated_at: new Date().toISOString() }

      // Pick up DCV info if missing
      if (!order.dcv_txt_value) {
        const { name: dn, value: dv } = extractDcv(statusRes)
        if (dv) {
          upd.dcv_txt_name = dn; upd.dcv_txt_value = dv
          upd.dcv_cname_name = dn; upd.dcv_cname_value = dv
          // Try auto-DNS if we just got the DCV info
          await autoDns(authHeader, user.id, order.domain, dn, dv)
        }
      }

      if (statusRes.status === 'active' && statusRes.crt_code) {
        upd.status     = 'active'
        upd.crt_code   = statusRes.crt_code
        upd.ca_code    = statusRes.ca_code
        upd.valid_from = statusRes.valid_from
        upd.valid_till = statusRes.valid_till

        // Get keylocker_key_id from this order (may have been updated after initial insert)
        const { data: freshOrder } = await adminDb().from('ssl_orders').select('keylocker_key_id').eq('id', order_id).single()
        const keyId = freshOrder?.keylocker_key_id || order.keylocker_key_id

        // Insert new cert row if first activation, or update if re-checking same order
        const certId = await upsertCert(order.ggs_order_id, {
          user_id:               user.id,
          domain:                order.domain,
          status:                'active',
          cert_pem:              statusRes.crt_code,
          ca_pem:                statusRes.ca_code,
          expires_at:            statusRes.valid_till,
          issued_at:             statusRes.valid_from,
          subscription_end_date: calcSubscriptionEnd(statusRes.valid_from || new Date().toISOString(), order.period || 12),
          issuer:                order.product_name || 'RapidSSL',
          cert_type:             order.product_name || 'RapidSSL DV',
          source:                'gogetssl',
          ggs_order_id:          order.ggs_order_id,
          serial_number:         statusRes.serial_number || null,
          fingerprint_sha1:      statusRes.md5 || null,
          common_name:           statusRes.common_name || order.domain,
          private_key_pem:       null,
          keylocker_key_id:      keyId || null,
          dcv_method:            'dns',
          order_type:            order.order_purpose || 'original',
          is_current:            true,
        })

        // Link keylocker entry to cert row
        if (keyId && certId) {
          await adminDb().from('keylocker_keys').update({ cert_id: certId, expires_at: statusRes.valid_till }).eq('id', keyId)
        }

        // Clean up DCV TXT record from DNS
        if (order.dcv_txt_name && order.dcv_txt_value) {
          await autoDeleteDns(authHeader, user.id, order.domain, order.dcv_txt_name, order.dcv_txt_value)
        }

        // Dispatch auto-install — same as poll_pending does for reissues.
        // dispatchInstall is silent-fail (try/catch inside) so cert activation
        // is never affected if this errors. If no credentials found, exits cleanly.
        await dispatchInstall(user.id, order.domain, order.ggs_order_id, keyId)
      }

      await adminDb().from('ssl_orders').update(upd).eq('id', order_id)

      return json({
        ok:            true,
        status:        upd.status || order.status,
        ggs_status:    statusRes.status,
        dcv_txt_name:  upd.dcv_txt_name  || order.dcv_txt_name,
        dcv_txt_value: upd.dcv_txt_value || order.dcv_txt_value,
        crt_code:      statusRes.crt_code,
        ca_code:       statusRes.ca_code,
        valid_till:    statusRes.valid_till,
      })
    }



    // ── REISSUE ───────────────────────────────────────────────────────
    // Replace cert on SAME GGS order. Fresh keypair. NO new order_id.
    // Updates existing ssl_orders row in place.
    // Inserts cert_reissues row as audit log only.
    if (action === 'reissue') {
      const { cert_id } = body
      if (!cert_id) return json({ error: 'cert_id required' }, 400)

      const { data: cert } = await adminDb().from('certificates').select('*').eq('id', cert_id).eq('user_id', user.id).single()
      if (!cert) return json({ error: 'Certificate not found' }, 404)

      // Get the current active ssl_orders row for this cert
      const { data: order } = await adminDb()
        .from('ssl_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('ggs_order_id', cert.ggs_order_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!order) return json({ error: 'No ssl_orders row found for this cert — cannot reissue' }, 400)
      if (!cert.ggs_order_id) return json({ error: 'Certificate has no GGS order ID — cannot reissue' }, 400)

      // Block if any dv_pending reissue already exists for this order
      const { data: pendingReissue } = await adminDb()
        .from('cert_reissues')
        .select('id, created_at')
        .eq('ggs_order_id', cert.ggs_order_id)
        .eq('status', 'dv_pending')
        .limit(1)
        .single()

      if (pendingReissue) {
        // Check GGS — maybe it already activated but we haven't polled yet
        const authKeyCheck = await ggsAuth()
        const st = await ggsGet(authKeyCheck, `/orders/status/${cert.ggs_order_id}`)
        if (st.status === 'active') {
          // Already done — mark completed and allow new reissue
          await adminDb().from('cert_reissues').update({ status: 'completed', installed_at: new Date().toISOString() }).eq('id', pendingReissue.id)
        } else {
          return json({ error: 'A reissue is already pending for this certificate. Please wait for DNS validation to complete.', code: 'REISSUE_IN_PROGRESS' }, 409)
        }
      }

      // Generate fresh keypair + CSR for reissue
      const cleanDomain = cert.domain
      const product_code = order.product_code || 'rapidssl'
      const csrDomain = PRODUCT_META[product_code]?.wildcard
        ? (cleanDomain.startsWith('*.') ? cleanDomain : `*.${cleanDomain}`)
        : cleanDomain

      const { csrPem, privateKeyPem } = await generateCSRAndKey(csrDomain)
      const authKey = await ggsAuth()

      // Call GGS reissue — same order_id, new CSR
      const reissueRes = await ggsPost(authKey, `/orders/ssl/reissue/${cert.ggs_order_id}/`, {
        csr:            csrPem,
        webserver_type: '2',
        dcv_method:     'dns',
      })
      if (!reissueRes.order_id && !reissueRes.success) {
        return json({ error: reissueRes.description || reissueRes.message || JSON.stringify(reissueRes) }, 500)
      }

      // ONE quick DCV check after 2s (same wall-clock limit as place_order)
      // poll_pending cron rescues if DCV not ready in time
      let dcvName = '', dcvValue = '', statusRes: any = {}
      try {
        await new Promise(r => setTimeout(r, 2000))
        statusRes = await ggsGet(authKey, `/orders/status/${cert.ggs_order_id}`)
        const dcv = extractDcv(statusRes)
        dcvName = dcv.name; dcvValue = dcv.value
        if (!dcvValue) console.log('[reissue] DCV not ready after 2s — poll_pending cron will rescue')
      } catch (e: any) { console.warn('[reissue] quick DCV check failed (non-fatal):', e.message) }

      // Store NEW private key in KeyLocker immediately
      // This key matches the new CSR we just submitted to GGS
      const klRes = await callKeyLocker(authHeader, {
        action: 'store', private_key_pem: privateKeyPem, domain: cleanDomain,
        order_id: order.id, ggs_order_id: cert.ggs_order_id,
        csr_pem: csrPem, product_name: order.product_name || 'RapidSSL', algorithm: 'RSA', key_size: 2048,
      })
      const newKeyId = klRes.ok ? klRes.key_id : null
      if (!newKeyId) {
        console.error('[reissue] KeyLocker store failed:', klRes.error)
        // Store plain text as fallback so we don't lose the key
        await adminDb().from('ssl_orders').update({ private_key_pem: privateKeyPem }).eq('id', order.id)
      }

      const now = new Date().toISOString()

      // Reset live flag so retry logic re-installs after new cert issues
      try { await adminDb().from('certificates').update({ is_live_on_server: false, install_pending_since: null }).eq('id', cert_id) } catch {}

      // Update EXISTING ssl_orders row in place (NOT insert — reissue = same order)
      await adminDb().from('ssl_orders').update({
        status:          'dv_pending',
        csr_code:        csrPem,
        dcv_txt_name:    dcvName || null,
        dcv_txt_value:   dcvValue || null,
        dcv_cname_name:  dcvName || null,
        dcv_cname_value: dcvValue || null,
        ggs_status:      statusRes.status || 'dv_pending',
        keylocker_key_id: newKeyId || order.keylocker_key_id,
        private_key_pem: newKeyId ? null : privateKeyPem, // clear if keylocker succeeded
        updated_at:      now,
      }).eq('id', order.id)

      // Update certificates row: mark as pending reissue, store new keylocker_key_id
      // The cert_pem stays as current until poll_pending activates the new cert
      await adminDb().from('certificates').update({
        keylocker_key_id: newKeyId || cert.keylocker_key_id,
        updated_at: now,
      }).eq('id', cert_id)

      // Log reissue event (audit only)
      const { data: reissueRow } = await adminDb().from('cert_reissues').insert({
        user_id:        user.id,
        cert_id,
        ggs_order_id:   cert.ggs_order_id,
        new_ggs_order_id: cert.ggs_order_id, // same order — reissue doesn't change it
        status:         'dv_pending',
        triggered_by:   body.triggered_by || 'manual',
        new_keylocker_key_id: newKeyId || null,
      }).select().single()

      // Auto-add new DCV TXT record
      await autoDns(authHeader, user.id, cleanDomain, dcvName, dcvValue)

      return json({
        ok:            true,
        status:        'dv_pending',
        ggs_order_id:  cert.ggs_order_id,
        dcv_txt_name:  dcvName,
        dcv_txt_value: dcvValue,
        reissue_id:    reissueRow?.id || null,
      })
    }

    // ── RENEW ─────────────────────────────────────────────────────────
    // Completely new GGS order. New billing period. New ssl_orders row.
    // Triggered 30 days before subscription_end_date.
    if (action === 'renew') {
      const { cert_id } = body
      if (!cert_id) return json({ error: 'cert_id required' }, 400)

      const { data: cert } = await adminDb().from('certificates').select('*').eq('id', cert_id).eq('user_id', user.id).single()
      if (!cert) return json({ error: 'Certificate not found' }, 404)

      // Get contact details from latest order for this cert
      const { data: oldOrder } = await adminDb()
        .from('ssl_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('ggs_order_id', cert.ggs_order_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const cleanDomain = cert.domain
      const product_code = oldOrder?.product_code || 'rapidssl'
      const csrDomain = PRODUCT_META[product_code]?.wildcard
        ? (cleanDomain.startsWith('*.') ? cleanDomain : `*.${cleanDomain}`)
        : cleanDomain
      const period     = body.period || oldOrder?.period || 12
      const adminEmail = oldOrder?.admin_email || `admin@${cleanDomain}`
      const firstName  = oldOrder?.admin_first_name || 'Admin'
      const lastName   = oldOrder?.admin_last_name  || 'Admin'
      const phone      = oldOrder?.admin_phone      || '+1.5555555555'

      const { csrPem, privateKeyPem } = await generateCSRAndKey(csrDomain)
      const authKey = await ggsAuth()
      const product = await resolveProductId(authKey, product_code)

      const renewRes = await ggsPost(authKey, '/orders/add_ssl_order/', {
        product_id:       String(product.id),
        period:           String(period),
        csr:              csrPem,
        server_count:     '-1',
        webserver_type:   '2',
        dcv_method:       'dns',
        approver_email:   `admin@${cleanDomain}`,
        admin_email:      adminEmail,
        admin_firstname:  firstName,
        admin_lastname:   lastName,
        admin_title:      'Mr',
        admin_phone:      phone,
        tech_firstname:   firstName,
        tech_lastname:    lastName,
        tech_email:       adminEmail,
        tech_phone:       phone,
        tech_title:       'Mr',
      })
      if (!renewRes.order_id) return json({ error: renewRes.description || 'Renewal order failed' }, 500)

      const now = new Date().toISOString()

      // Insert new ssl_orders row for the renewal
      const { data: newOrder, error: ordErr } = await adminDb()
        .from('ssl_orders')
        .insert({
          user_id:          user.id,
          domain:           cleanDomain,
          product_id:       product.id,
          product_name:     product.name,
          product_code,
          period,
          status:           'dv_pending',
          order_purpose:    'renewal',
          ggs_order_id:     renewRes.order_id,
          csr_code:         csrPem,
          private_key_pem:  null,
          admin_email:      adminEmail,
          admin_first_name: firstName,
          admin_last_name:  lastName,
          admin_phone:      phone,
          created_at:       now,
          updated_at:       now,
        })
        .select().single()
      if (ordErr) return json({ error: ordErr.message }, 500)

      // Store new private key in KeyLocker
      const klRes = await callKeyLocker(authHeader, {
        action: 'store', private_key_pem: privateKeyPem, domain: cleanDomain,
        order_id: newOrder.id, ggs_order_id: renewRes.order_id,
        csr_pem: csrPem, product_name: product.name, algorithm: 'RSA', key_size: 2048,
      })
      if (klRes.ok && klRes.key_id) {
        await adminDb().from('ssl_orders').update({ keylocker_key_id: klRes.key_id }).eq('id', newOrder.id)
        newOrder.keylocker_key_id = klRes.key_id
      }

      // ONE quick DCV check — do not loop, same wall-clock limit applies
      let dcvName = '', dcvValue = ''
      try {
        await new Promise(r => setTimeout(r, 2000))
        const renewStatus = await ggsGet(authKey, `/orders/status/${renewRes.order_id}`)
        const fromOrder = extractDcv(renewRes)
        const fromStatus = extractDcv(renewStatus)
        dcvName = fromOrder.name || fromStatus.name
        dcvValue = fromOrder.value || fromStatus.value
        if (dcvValue) {
          await adminDb().from('ssl_orders').update({
            dcv_txt_name: dcvName, dcv_txt_value: dcvValue,
            dcv_cname_name: dcvName, dcv_cname_value: dcvValue,
            ggs_status: renewStatus.status || 'dv_pending', updated_at: new Date().toISOString(),
          }).eq('id', newOrder.id)
          await autoDns(authHeader, user.id, cleanDomain, dcvName, dcvValue)
        }
      } catch (e: any) {
        console.warn('[renew] quick DCV check failed (non-fatal):', e.message)
      }

      // Log renewal in cert_reissues (for history display)
      await adminDb().from('cert_reissues').insert({
        user_id:         user.id,
        cert_id,
        ggs_order_id:    cert.ggs_order_id,      // old order
        new_ggs_order_id: renewRes.order_id,      // new order
        status:          'dv_pending',
        triggered_by:    body.triggered_by || 'manual',
        reissue_type:    'renewal',
        new_keylocker_key_id: newOrder.keylocker_key_id || null,
      })

      return json({
        ok:            true,
        status:        'dv_pending',
        order_id:      newOrder.id,
        ggs_order_id:  renewRes.order_id,
        dcv_txt_name:  dcvName,
        dcv_txt_value: dcvValue,
      })
    }

    // ── GET HISTORY ───────────────────────────────────────────────────
    // Returns split reissue + renewal history for a cert
    if (action === 'get_history') {
      const { cert_id } = body
      if (!cert_id) return json({ error: 'cert_id required' }, 400)

      const { data, error: dbErr } = await adminDb()
        .from('cert_reissues')
        .select('id, created_at, ggs_order_id, new_ggs_order_id, status, triggered_by, expires_at, issued_at, cert_pem, reissue_type, install_status, install_method, installed_at, auto_install_status, auto_install_error, reissue_number')
        .eq('user_id', user.id)
        .or(`cert_id.eq.${cert_id},new_cert_id.eq.${cert_id}`)
        .order('created_at', { ascending: false })
        .limit(30)
      if (dbErr) return json({ error: dbErr.message }, 500)

      const rows = data || []
      const reissues = rows.filter(r => r.reissue_type !== 'renewal')
      const renewals = rows.filter(r => r.reissue_type === 'renewal')

      return json({ ok: true, reissues, renewals })
    }

    // ── GET PROFILE ───────────────────────────────────────────────────
    if (action === 'get_profile') {
      const { domain } = body
      if (!domain) return json({ error: 'domain required' }, 400)
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
      const { data } = await adminDb()
        .from('domain_profiles')
        .select('first_name, last_name, email, phone, updated_at')
        .eq('user_id', user.id)
        .eq('domain', cleanDomain)
        .single()
      return json({ ok: true, profile: data || null })
    }

    // ── GET PRODUCTS ──────────────────────────────────────────────────
    if (action === 'get_products') {
      const authKey = await ggsAuth()
      const resp    = await ggsGet(authKey, '/products/ssl/')
      const entries = normaliseProducts(resp)
      return json({ ok: true, products: entries.filter(({ name }) => name.toLowerCase().includes('rapidssl')) })
    }

    return json({ error: `Unknown action: ${action}` }, 400)

  } catch (e: any) {
    console.error('[gogetssl-issue]', e)
    return json({ error: e.message || 'Internal error' }, 500)
  }
})

// ── Dispatch install job after cert activates ─────────────────────────
async function dispatchInstall(userId: string, domain: string, ggsOrderId: number, keyId: string | null): Promise<void> {
  try {
    const { data: cert } = await adminDb()
      .from('certificates')
      .select('id, install_method, install_server_id, cert_pem, ca_pem')
      .eq('user_id', userId)
      .eq('ggs_order_id', ggsOrderId)
      .single()
    if (!cert) return

    let installMethod = cert.install_method
    let installCredId  = cert.install_server_id

    // Auto-detect if not set — look up saved credentials for this domain/user
    if (!installMethod) {
      // Check for cPanel credential first
      const { data: cpCreds } = await adminDb()
        .from('server_credentials')
        .select('id, server_type, agent_id, domains')
        .eq('user_id', userId)
        .in('server_type', ['cpanel', 'shared'])
      // Only match cPanel if domain is explicitly listed — never fall back to first credential
      const cpMatch = (cpCreds || []).find((c: any) => c.domains?.includes(domain))
      if (cpMatch) {
        installMethod = 'cpanel'
        installCredId = cpMatch.id
        // Save back to cert so future auto-installs work without detection
        await adminDb().from('certificates').update({ install_method: 'cpanel', install_server_id: cpMatch.id }).eq('id', cert.id)
        console.log('[dispatch] auto-detected cPanel for', domain)
      } else {
        // Check for VPS agent
        const { data: agentRows } = await adminDb()
          .from('server_credentials')
          .select('id, agent_id')
          .eq('user_id', userId)
          .not('agent_id', 'is', null)
        const agentRow = (agentRows || []).find((r: any) => r.agent_id)
        if (agentRow) {
          installMethod = 'agent'
          await adminDb().from('certificates').update({ install_method: 'agent' }).eq('id', cert.id)
          console.log('[dispatch] auto-detected agent for', domain)
        }
      }
    }

    if (installMethod === 'agent') {
      const { data: serverRows } = await adminDb()
        .from('server_credentials')
        .select('id, agent_id')
        .eq('user_id', userId)
        .not('agent_id', 'is', null)
      for (const row of (serverRows || [])) {
        const { data: existing } = await adminDb().from('agent_jobs').select('id')
          .eq('agent_id', row.agent_id).eq('cert_id', cert.id).in('status', ['queued','claimed']).maybeSingle()
        if (!existing) {
          await adminDb().from('agent_jobs').insert({
            agent_id:   row.agent_id,
            user_id:    userId,
            cert_id:    cert.id,
            job_type:   'install',
            status:     'queued',
            cert_pem:   cert.cert_pem || '',
            ca_pem:     cert.ca_pem  || '',
            key_pem:    '',
            domain,
          })
        }
      }
    } else if (installMethod === 'cpanel' && installCredId) {
      // Stamp install_pending_since so retry loop knows when to re-fire
      try { await adminDb().from('certificates').update({ install_pending_since: new Date().toISOString() }).eq('id', cert.id) } catch {}
      // Fire-and-forget — never await (wall-clock limit in poll_pending)
      const installPayload = JSON.stringify({
        action: 'install', cert_id: cert.id, domain,
        credential_id: installCredId, _service_user_id: userId,
      })
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cpanel-install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: installPayload,
      }).then(r => r.json()).then(result => {
        if (result.ok) console.log('[dispatch] cPanel install SUCCESS for', domain)
        else console.error('[dispatch] cPanel install FAILED for', domain, ':', result.error)
      }).catch((e: any) => console.error('[dispatch] cPanel install exception:', e.message))
    } else {
      console.log('[dispatch] no install method for', domain, '— customer must install manually')
    }
  } catch (e: any) {
    console.warn('[dispatchInstall]', e.message)
  }
}
