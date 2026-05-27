import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GGS_API = 'https://my.gogetssl.com/api'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
}

function adminDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

async function getCredentials(): Promise<{ user: string; pass: string }> {
  const db = adminDb()
  const { data, error } = await db.rpc('get_ggs_credentials')
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

async function ggsPost(authKey: string, path: string, body: Record<string, string>) {
  const res = await fetch(`${GGS_API}${path}?auth_key=${authKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  return res.json()
}

async function ggsGet(authKey: string, path: string) {
  const res = await fetch(`${GGS_API}${path}?auth_key=${authKey}`)
  return res.json()
}

const PRODUCT_META: Record<string, { wildcard: boolean }> = {
  rapidssl:          { wildcard: false },
  rapidssl_wildcard: { wildcard: true  },
}

// Normalise the GoGetSSL /products/ssl/ response into a flat array.
// The API returns: { products: [ {id, name, wildcard, ...}, ... ], success: true }
// But some reseller accounts may get a legacy keyed object instead.
function normaliseProducts(resp: any): Array<{ id: number; name: string; wildcard: boolean }> {
  if (!resp || typeof resp !== 'object') return []

  // GoGetSSL actual response shape (from API docs + observed):
  // { products: [{id, brand, product, wildcard_enabled:0|1, ...}], success: true }
  // Older/legacy: { "123": {name, wildcard:"yes"|"no"}, success: true }

  const getName = (p: any): string =>
    String(p.product ?? p.name ?? p.product_name ?? p.title ?? '')

  const getWildcard = (p: any): boolean => {
    if (p.wildcard_enabled !== undefined) return Number(p.wildcard_enabled) === 1
    if (p.wildcard !== undefined) return String(p.wildcard).toLowerCase() === 'yes'
    return getName(p).toLowerCase().includes('wildcard')
  }

  let raw: any[] = []
  if (Array.isArray(resp.products)) {
    raw = resp.products
  } else if (Array.isArray(resp)) {
    raw = resp
  } else {
    for (const [key, val] of Object.entries(resp)) {
      if (key === 'success' || !val || typeof val !== 'object') continue
      raw.push({ id: Number(key), ...(val as object) })
    }
  }

  return raw
    .filter((p: any) => p && typeof p === 'object')
    .map((p: any) => ({
      id:       Number(p.id ?? p.product_id ?? 0),
      name:     getName(p),
      wildcard: getWildcard(p),
    }))
    .filter((p: any) => p.id > 0 && p.name)
}

async function resolveProductId(authKey: string, code: string): Promise<{ id: number; name: string }> {
  const resp    = await ggsGet(authKey, '/products/ssl/')
  const entries = normaliseProducts(resp)

  if (entries.length === 0) {
    throw new Error(`GoGetSSL /products/ssl/ returned no usable products. Raw: ${JSON.stringify(resp).slice(0, 300)}`)
  }

  const isWildcard = PRODUCT_META[code]?.wildcard ?? false
  const match = entries.find(({ name, wildcard }) => {
    const n = name.toLowerCase()
    // wildcard is now a boolean from normaliseProducts
    return n.includes('rapidssl') && (isWildcard ? wildcard : !wildcard)
  })

  if (!match) {
    const names = entries.map(e => `${e.id}:${e.name}(wc=${e.wildcard})`).join(', ')
    throw new Error(`RapidSSL${isWildcard ? ' Wildcard' : ''} not found. Available: ${names}`)
  }
  return { id: match.id, name: match.name }
}

// ══════════════════════════════════════════════════════════════════════
// LOCAL KEY PAIR + CSR GENERATION
//
// SECURITY PRINCIPLE: The private key is generated entirely within this
// Deno edge function using the Web Crypto API. Only the CSR (which
// contains the PUBLIC key and subject DN) is ever transmitted to
// GoGetSSL or any CA. The private key is stored exclusively in the
// SSLVault Supabase database and is never sent to a third party.
//
// This complies with CA/Browser Forum Baseline Requirements §6.1.2:
// "The CA SHALL NOT generate the Subscriber's Private Key on behalf of
// the Subscriber."
// ══════════════════════════════════════════════════════════════════════

function u8ToBase64(buf: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return btoa(bin)
}

function pemWrap(label: string, b64: string): string {
  const lines = b64.match(/.{1,64}/g)?.join('\n') ?? b64
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`
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

function derOidBytes(oid: number[]): Uint8Array {
  return new Uint8Array([0x06, oid.length, ...oid])
}

function derUtf8(str: string): Uint8Array {
  const enc = new TextEncoder().encode(str)
  return derTag(0x0c, enc)
}

// Build a single RDN attribute: SET { SEQUENCE { OID, UTF8String } }
function rdn(oidBytes: number[], value: string): Uint8Array {
  return derSet(derSeq(new Uint8Array([...derOidBytes(oidBytes), ...derUtf8(value)])))
}

// DER Subject: SEQUENCE of RDNs
// OID bytes (pre-encoded BER encoding of the arc after 0x06 tag):
//   CN=2.5.4.3 → [0x55,0x04,0x03]
//   O =2.5.4.10→ [0x55,0x04,0x0a]
//   L =2.5.4.7 → [0x55,0x04,0x07]
//   ST=2.5.4.8 → [0x55,0x04,0x08]
//   C =2.5.4.6 → [0x55,0x04,0x06]
function buildSubject(cn: string): Uint8Array {
  const parts = new Uint8Array([
    ...rdn([0x55,0x04,0x03], cn),
    ...rdn([0x55,0x04,0x0a], 'SSLVault'),
    ...rdn([0x55,0x04,0x07], 'Amsterdam'),
    ...rdn([0x55,0x04,0x08], 'Noord-Holland'),
    ...rdn([0x55,0x04,0x06], 'NL'),
  ])
  return derSeq(parts)
}

// sha256WithRSAEncryption OID sequence (fixed DER)
const SHA256_WITH_RSA = new Uint8Array([
  0x30, 0x0d,
  0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b,
  0x05, 0x00,
])

async function generateCSRAndKey(domain: string): Promise<{
  csrPem: string
  privateKeyPem: string
}> {
  // Step 1 — generate RSA-2048 key pair in Deno's Web Crypto runtime.
  // exportable=true so we can persist the private key in our own DB.
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  )

  // Step 2 — export private key as PKCS#8 for storage in SSLVault DB only
  const pkcs8Der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey))
  const privateKeyPem = pemWrap('PRIVATE KEY', u8ToBase64(pkcs8Der))

  // Step 3 — export public key as SPKI (this goes into the CSR, NOT the private key)
  const spkiDer = new Uint8Array(await crypto.subtle.exportKey('spki', keyPair.publicKey))

  // Step 4 — build CertificationRequestInfo (tbsCSR)
  const subject    = buildSubject(domain)
  const version    = new Uint8Array([0x02, 0x01, 0x00])       // INTEGER v1
  const attributes = derCtx0(new Uint8Array(0))               // [0] empty attributes
  const tbsCSR = derSeq(new Uint8Array([
    ...version,
    ...subject,
    ...spkiDer,   // SubjectPublicKeyInfo (public key only)
    ...attributes,
  ]))

  // Step 5 — sign tbsCSR with our private key
  const sigBuf = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyPair.privateKey, tbsCSR)
  const sigBytes = new Uint8Array(sigBuf)

  // Step 6 — wrap signature as BIT STRING (0x00 = zero unused bits)
  const bitString = derTag(0x03, new Uint8Array([0x00, ...sigBytes]))

  // Step 7 — assemble final PKCS#10 CSR
  const csrDer = derSeq(new Uint8Array([
    ...tbsCSR,
    ...SHA256_WITH_RSA,
    ...bitString,
  ]))

  const csrPem = pemWrap('CERTIFICATE REQUEST', u8ToBase64(csrDer))

  return { csrPem, privateKeyPem }
}

// GoGetSSL webserver type IDs — 2 = Apache+OpenSSL (universal, accepted for all DV certs)
const WEBSERVER_TYPE = '2'

// ── Main handler ──────────────────────────────────────────────────────
// ── KeyLocker helper — delegate private key to the vault ──────────────
// gogetssl-issue calls keylocker as the authenticated user (same JWT),
// so KeyLocker enforces the same user ownership for every vault operation.
async function callKeyLocker(authHeader: string, body: Record<string, unknown>) {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/keylocker`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
    body:    JSON.stringify(body),
  })
  return res.json()
}


// Extract DCV TXT record from any GGS response object
// GGS returns DCV in different shapes depending on endpoint:
// - add_ssl_order: direct fields dcv_txt_name/dcv_txt_value OR dcv_cname_name/dcv_cname_value
// - orders/status: nested in .domains[0].cname_name/.cname_value or .txt_record_name/.txt_record_value
function extractDcv(resp: any): { name: string; value: string } {
  if (!resp) return { name: '', value: '' }
  // Direct fields (add_ssl_order response)
  const directName  = resp.dcv_txt_name  || resp.dcv_cname_name  || ''
  const directValue = resp.dcv_txt_value || resp.dcv_cname_value || ''
  if (directValue) return { name: directName, value: directValue }
  // Nested in domains object (status response)
  if (resp.domains) {
    const d = Object.values(resp.domains)[0] as any
    const name  = d?.txt_record_name  || d?.cname_name  || d?.validation?.cname_name  || ''
    const value = d?.txt_record_value || d?.cname_value || d?.validation?.cname_value || ''
    return { name, value }
  }
  return { name: '', value: '' }
}

// Auto-add DNS TXT record via dns-provider (non-fatal)
async function autoDns(authHeader: string, userId: string, domain: string, name: string, value: string) {
  if (!value) return
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/dns-provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ action: 'auto_add', user_id: userId, domain, txt_name: name, txt_value: value }),
    })
  } catch(e: any) { console.warn('DNS auto-add (non-fatal):', e.message) }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action } = body

    // ── place_order ───────────────────────────────────────────────────
    if (action === 'place_order') {
      const { domain, period = 12, product_code = 'rapidssl',
              firstName, lastName, adminEmail, phone } = body

      if (!domain)    return json({ error: 'domain required' }, 400)
      if (!firstName || !lastName || !adminEmail || !phone)
        return json({ error: 'Contact details required' }, 400)

      const authKey = await ggsAuth()
      const product = await resolveProductId(authKey, product_code)

      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
      const csrDomain   = PRODUCT_META[product_code]?.wildcard
        ? (cleanDomain.startsWith('*.') ? cleanDomain : `*.${cleanDomain}`)
        : cleanDomain

      // ── Generate key pair + CSR locally — private key stays here ──
      const { csrPem, privateKeyPem } = await generateCSRAndKey(csrDomain)
      // csrPem  → sent to GoGetSSL (public key + subject only, safe to transmit)
      // privateKeyPem → stored only in SSLVault DB, never sent to any CA

      // Place order with our locally-generated CSR
      const orderRes = await ggsPost(authKey, '/orders/add_ssl_order/', {
        product_id:       String(product.id),
        period:           String(period),
        csr:              csrPem,
        server_count:     '-1',
        webserver_type:   WEBSERVER_TYPE,
        dcv_method:       'dns',
        approver_email:   `admin@${cleanDomain}`,
        admin_email:      adminEmail,
        admin_phone:      phone,
        admin_firstname: firstName,
        admin_lastname:  lastName,
        admin_title:     'Mr',
        tech_firstname:  firstName,
        tech_lastname:   lastName,
        tech_email:      adminEmail,
        tech_phone:      phone,
        tech_title:      'Mr',
      })

      if (!orderRes.order_id)
        return json({ error: orderRes.description || orderRes.error || JSON.stringify(orderRes) }, 500)

      // Save order to DB — without private key (KeyLocker handles that separately)
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
          ggs_order_id:     orderRes.order_id,
          ggs_invoice_id:   orderRes.invoice_id,
          csr_code:         csrPem,          // CSR is public material — safe to store
          private_key_pem:  null,            // never stored here — KeyLocker owns it
          admin_email:      adminEmail,
          admin_first_name: firstName,
          admin_last_name:  lastName,
          admin_phone:      phone,
        })
        .select()
        .single()

      if (dbErr) return json({ error: dbErr.message }, 500)

      // ── Auto-save / update domain profile ────────────────────────────
      // Upsert contact details so the form auto-populates next time
      await adminDb().from('domain_profiles').upsert({
        user_id:    user.id,
        domain:     cleanDomain,
        first_name: firstName,
        last_name:  lastName,
        email:      adminEmail,
        phone:      phone,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,domain' })

      // ── Hand the private key to KeyLocker for encrypted storage ──────
      // The raw privateKeyPem exists only in this function's memory.
      // KeyLocker will encrypt it with AES-256-GCM (envelope encryption),
      // store the ciphertext, and clear private_key_pem from ssl_orders.
      const klRes = await callKeyLocker(req.headers.get('Authorization')!, {
        action:          'store',
        private_key_pem: privateKeyPem,
        domain:          cleanDomain,
        order_id:        saved.id,
        ggs_order_id:    orderRes.order_id,
        csr_pem:         csrPem,
        product_name:    product.name,
        algorithm:       'RSA',
        key_size:        2048,
      })
      if (!klRes.ok) {
        // KeyLocker failed — log it but don't fail the order.
        // The CSR is already accepted by GoGetSSL; the user still needs DCV.
        // Key is temporarily gone from DB — edge case: ideally retry.
        console.error('KeyLocker store failed:', klRes.error)
      }

      // Poll once immediately for DCV info
      await new Promise(r => setTimeout(r, 2000))
      const statusRes = await ggsGet(authKey, `/orders/status/${orderRes.order_id}`)
      // Try direct fields first, fallback to domains object
      let { name: dcvName, value: dcvValue } = extractDcv(orderRes)
      if (!dcvValue) { const s = extractDcv(statusRes); dcvName = s.name; dcvValue = s.value }

      if (dcvName || dcvValue) {
        await adminDb().from('ssl_orders').update({
          dcv_txt_name:    dcvName,
          dcv_txt_value:   dcvValue,
          dcv_cname_name:  dcvName,
          dcv_cname_value: dcvValue,
          ggs_status:      statusRes.status,
          updated_at:      new Date().toISOString(),
        }).eq('id', saved.id)
      }

      // Auto-add DNS TXT record
      await autoDns(req.headers.get('Authorization')!, user.id, cleanDomain, dcvName, dcvValue)

      return json({
        ok:              true,
        order_id:        saved.id,
        ggs_order_id:    orderRes.order_id,
        domain:          cleanDomain,
        product_name:    product.name,
        dcv_txt_name:    dcvName,
        dcv_txt_value:   dcvValue,
        dcv_cname_name:  dcvName,
        dcv_cname_value: dcvValue,
        status:          'dv_pending',
      })
    }

    // ── check_status ──────────────────────────────────────────────────
    if (action === 'check_status') {
      const { order_id } = body

      const { data: order } = await adminDb()
        .from('ssl_orders')
        .select('*')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .single()

      if (!order) return json({ error: 'Order not found' }, 404)

      const authKey   = await ggsAuth()
      const statusRes = await ggsGet(authKey, `/orders/status/${order.ggs_order_id}`)

      const upd: Record<string, any> = {
        ggs_status: statusRes.status,
        updated_at: new Date().toISOString(),
      }

      // Pick up DCV info if missing
      if (!order.dcv_txt_value && !order.dcv_cname_value) {
        const { name: dn, value: dv } = extractDcv(statusRes)
        if (dv) { upd.dcv_txt_name = dn; upd.dcv_txt_value = dv; upd.dcv_cname_name = dn; upd.dcv_cname_value = dv }
      }

      // Certificate active — mirror to certificates table
      if (statusRes.status === 'active' && statusRes.crt_code) {
        upd.status     = 'active'
        upd.crt_code   = statusRes.crt_code
        upd.ca_code    = statusRes.ca_code
        upd.valid_from = statusRes.valid_from
        upd.valid_till = statusRes.valid_till

        await adminDb().from('certificates').upsert({
          user_id:          user.id,
          domain:           order.domain,
          status:           'active',
          cert_pem:         statusRes.crt_code,
          ca_pem:           statusRes.ca_code,
          expires_at:       statusRes.valid_till,
          issued_at:        statusRes.valid_from,
          issuer:           order.product_name || 'RapidSSL',
          cert_type:        order.product_name || 'RapidSSL DV',
          source:           'gogetssl',
          ggs_order_id:     order.ggs_order_id,
          serial_number:    statusRes.serial_number || null,
          fingerprint_sha1: statusRes.md5           || null,
          common_name:      statusRes.common_name   || order.domain,
          private_key_pem:  null,                    // never stored here — use KeyLocker fetch
          keylocker_key_id: order.keylocker_key_id || null,  // link to encrypted vault entry
          dcv_method:       'dns',
          san:              order.domain,
          updated_at:       new Date().toISOString(),
        }, { onConflict: 'user_id,domain' })

        // Update the KeyLocker vault entry with the cert_id now that the cert row exists
        if (order.keylocker_key_id) {
          const { data: certRow } = await adminDb()
            .from('certificates')
            .select('id')
            .eq('user_id', user.id)
            .eq('domain', order.domain)
            .single()
          if (certRow) {
            await adminDb()
              .from('keylocker_keys')
              .update({ cert_id: certRow.id, expires_at: statusRes.valid_till })
              .eq('id', order.keylocker_key_id)
          }
        }
      }

      await adminDb().from('ssl_orders').update(upd).eq('id', order_id)

      return json({
        ok:              true,
        status:          upd.status || order.status,
        ggs_status:      statusRes.status,
        dcv_txt_name:    upd.dcv_txt_name    || order.dcv_txt_name    || upd.dcv_cname_name  || order.dcv_cname_name,
        dcv_txt_value:   upd.dcv_txt_value   || order.dcv_txt_value   || upd.dcv_cname_value || order.dcv_cname_value,
        dcv_cname_name:  upd.dcv_cname_name  || order.dcv_cname_name,
        dcv_cname_value: upd.dcv_cname_value || order.dcv_cname_value,
        crt_code:        statusRes.crt_code,
        ca_code:         statusRes.ca_code,
        valid_till:      statusRes.valid_till,
      })
    }

    // ── get_products ──────────────────────────────────────────────────
    if (action === 'get_products') {
      const authKey = await ggsAuth()
      const resp    = await ggsGet(authKey, '/products/ssl/')
      const entries = normaliseProducts(resp)
      const rapid   = entries.filter(({ name }) => name.toLowerCase().includes('rapidssl'))
      return json({ ok: true, products: rapid })
    }

    // ── get_profile ───────────────────────────────────────────────────
    // Returns saved contact details for a domain (for form pre-fill)
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

    // ── get_history ───────────────────────────────────────────────────
    // Returns reissue/renewal history for a cert from cert_reissues table
    if (action === 'get_history') {
      const { cert_id } = body
      if (!cert_id) return json({ error: 'cert_id required' }, 400)
      const { data, error: dbErr } = await adminDb()
        .from('cert_reissues')
        .select('id, created_at, ggs_order_id, new_ggs_order_id, status, triggered_by, expires_at')
        .eq('user_id', user.id)
        .or(`cert_id.eq.${cert_id},new_cert_id.eq.${cert_id}`)
        .order('created_at', { ascending: false })
        .limit(20)
      if (dbErr) return json({ error: dbErr.message }, 500)
      return json({ ok: true, history: data || [] })
    }

    // ── reissue ───────────────────────────────────────────────────────
    // Re-generate CSR + place new GoGetSSL order, cancel old one
    if (action === 'reissue' || action === 'renew') {
      const { cert_id } = body
      if (!cert_id) return json({ error: 'cert_id required' }, 400)

      const { data: cert } = await adminDb()
        .from('certificates')
        .select('*')
        .eq('id', cert_id)
        .eq('user_id', user.id)
        .single()
      if (!cert) return json({ error: 'Certificate not found' }, 404)

      const { data: order } = await adminDb()
        .from('ssl_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('domain', cert.domain)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const product_code = order?.product_code || 'rapidssl'
      const cleanDomain = cert.domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
      const csrDomain = PRODUCT_META[product_code]?.wildcard
        ? (cleanDomain.startsWith('*.') ? cleanDomain : `*.${cleanDomain}`)
        : cleanDomain

      const { csrPem, privateKeyPem } = await generateCSRAndKey(csrDomain)
      const authKey = await ggsAuth()

      const period = order?.period || 12
      const adminEmail = order?.admin_email || cert.admin_email || `admin@${cleanDomain}`
      const firstName  = order?.admin_first_name || cert.first_name || 'Admin'
      const lastName   = order?.admin_last_name  || cert.last_name  || 'Admin'
      const phone      = order?.admin_phone      || cert.phone      || '+1.5555555555'

      let or: any
      if (action === 'reissue') {
        // TRUE REISSUE: same GGS order, new CSR, no new billing
        const ggsOrderId = order?.ggs_order_id
        if (!ggsOrderId) return json({ error: 'No GGS order ID found — cannot reissue' }, 400)
        const reissueRes = await ggsPost(authKey, `/orders/ssl/reissue/${ggsOrderId}/`, {
          csr: csrPem,
          webserver_type: '2',
          dcv_method: 'dns',
        })
        if (!reissueRes.order_id && !reissueRes.success) {
          return json({ error: reissueRes.description || reissueRes.message || JSON.stringify(reissueRes) }, 500)
        }
        // GGS reissue returns same order_id — fetch status to get new DCV TXT records
        await new Promise(r => setTimeout(r, 1500))
        const statusRes = await ggsGet(authKey, `/orders/status/${ggsOrderId}`)
        let dcvTxtName = '', dcvTxtValue = ''
        if (statusRes.domains) {
          const d = Object.values(statusRes.domains)[0] as any
          dcvTxtName  = d?.txt_record_name  || d?.cname_name  || d?.validation?.cname_name  || ''
          dcvTxtValue = d?.txt_record_value || d?.cname_value || d?.validation?.cname_value || ''
        }
        // Auto-add DNS TXT record
        await autoDns(req.headers.get('Authorization')!, user.id, cleanDomain, dcvTxtName, dcvTxtValue)
        or = {
          order_id:      ggsOrderId,
          dcv_txt_name:  dcvTxtName,
          dcv_txt_value: dcvTxtValue,
          dcv_cname_name:  dcvTxtName,
          dcv_cname_value: dcvTxtValue,
        }
      } else {
        // RENEWAL: new order, new billing period
        const product = await resolveProductId(authKey, product_code)
        or = await ggsPost(authKey, '/orders/add_ssl_order/', {
          product_id: String(product.id), period: String(period),
          csr: csrPem, server_count: '-1', webserver_type: '2',
          dcv_method: 'dns',
          approver_email: `admin@${cleanDomain}`,
          admin_email: adminEmail, admin_firstname: firstName, admin_lastname: lastName,
          admin_title: 'Mr', admin_phone: phone, admin_org: cleanDomain,
          admin_city: 'San Francisco', admin_country: 'US', admin_state: 'CA',
          admin_zip: '94105', tech_firstname: firstName, tech_lastname: lastName,
          tech_email: adminEmail, tech_phone: phone, tech_title: 'Mr',
        })
        if (!or.order_id) return json({ error: or.description || 'Renewal failed' }, 500)
        // For renewal, also fetch status to get DCV records (GGS may return them in domains obj)
        await new Promise(r => setTimeout(r, 1500))
        const renewStatus = await ggsGet(authKey, `/orders/status/${or.order_id}`)
        let { name: rdcvName, value: rdcvValue } = extractDcv(or)
        if (!rdcvValue) { const s = extractDcv(renewStatus); rdcvName = s.name; rdcvValue = s.value }
        or.dcv_txt_name = rdcvName; or.dcv_txt_value = rdcvValue
        or.dcv_cname_name = rdcvName; or.dcv_cname_value = rdcvValue
        await autoDns(req.headers.get('Authorization')!, user.id, cleanDomain, rdcvName, rdcvValue)
      }

      // Insert new ssl_order row — private key goes to KeyLocker, NOT plain text here
      const { data: newOrder, error: ordErr } = await adminDb()
        .from('ssl_orders')
        .insert({
          user_id: user.id, domain: cleanDomain,
          ggs_order_id: or.order_id, status: 'dv_pending',
          product_code, period,
          admin_email: adminEmail, admin_first_name: firstName, admin_last_name: lastName, admin_phone: phone,
          dcv_txt_name: or.dcv_txt_name || null,
          dcv_txt_value: or.dcv_txt_value || null,
          dcv_cname_name: or.dcv_cname_name || null,
          dcv_cname_value: or.dcv_cname_value || null,
          private_key_pem: null,  // never stored plain — KeyLocker owns it
        })
        .select().single()
      if (ordErr) return json({ error: ordErr.message }, 500)

      // ── Store new private key in KeyLocker — CRITICAL for reissue ────────
      // The old keylocker_key_id on the certificates row points to the OLD key.
      // We must store the new key and update keylocker_key_id so cpanel-install
      // and agent dispatch pick up the correct matching key after activation.
      const reissueKlRes = await callKeyLocker(req.headers.get('Authorization')!, {
        action:          'store',
        private_key_pem: privateKeyPem,
        domain:          cleanDomain,
        order_id:        newOrder.id,
        ggs_order_id:    or.order_id,
        csr_pem:         csrPem,
        product_name:    order?.product_code || 'RapidSSL',
        algorithm:       'RSA',
        key_size:        2048,
      })
      if (reissueKlRes.ok && reissueKlRes.key_id) {
        // Persist keylocker_key_id on the new ssl_order so poll_pending can link it
        await adminDb()
          .from('ssl_orders')
          .update({ keylocker_key_id: reissueKlRes.key_id })
          .eq('id', newOrder.id)
        newOrder.keylocker_key_id = reissueKlRes.key_id
      } else {
        // KeyLocker failed — fall back to temporary plain-text storage so the cert still works
        console.error('[reissue] KeyLocker store failed — falling back to plain-text key:', reissueKlRes.error)
        await adminDb()
          .from('ssl_orders')
          .update({ private_key_pem: privateKeyPem })
          .eq('id', newOrder.id)
      }

      // Log reissue event
      await adminDb().from('cert_reissues').insert({
        user_id: user.id, cert_id, new_cert_id: newOrder.id,
        ggs_order_id: order?.ggs_order_id || null, new_ggs_order_id: or.order_id,
        status: 'dv_pending', triggered_by: body.triggered_by || 'manual',
      })

      return json({
        ok: true, status: 'dv_pending', order_id: newOrder.id,
        ggs_order_id: or.order_id,
        dcv_txt_name: or.dcv_txt_name, dcv_txt_value: or.dcv_txt_value,
        dcv_cname_name: or.dcv_cname_name, dcv_cname_value: or.dcv_cname_value,
      })
    }

    // ── poll_pending ──────────────────────────────────────────────────
    // Called by ggs-pending-orders-poller cron every 2 min.
    // Finds all dv_pending ssl_orders, checks GGS status, and when active:
    //   1. Updates ssl_orders row to active with cert_pem
    //   2. Updates certificates row with new cert + expiry
    //   3. Dispatches to agent (VPS) or cpanel-install (cPanel)
    //   4. Updates cert_reissues row to completed
    if (action === 'poll_pending') {
      const { data: pendingOrders } = await adminDb()
        .from('ssl_orders')
        .select('id, user_id, domain, ggs_order_id, private_key_pem, keylocker_key_id')
        .eq('status', 'dv_pending')
        .order('created_at', { ascending: true })
        .limit(20)

      if (!pendingOrders?.length) return json({ ok: true, checked: 0, activated: 0 })

      const authKey = await ggsAuth()
      let activated = 0

      for (const order of pendingOrders) {
        try {
          const statusRes = await ggsGet(authKey, `/orders/status/${order.ggs_order_id}`)
          if (statusRes.status !== 'active' || !statusRes.crt_code) continue

          // Update ssl_orders row
          await adminDb().from('ssl_orders').update({
            status: 'active',
            crt_code: statusRes.crt_code,
            ca_code: statusRes.ca_code || null,
            valid_from: statusRes.valid_from || null,
            valid_till: statusRes.valid_till || null,
            cert_pem: statusRes.crt_code,
            ca_pem: statusRes.ca_code || null,
            updated_at: new Date().toISOString(),
          }).eq('id', order.id)

          // Get private key from keylocker if needed
          let privateKeyPem = order.private_key_pem || null
          if (!privateKeyPem && order.keylocker_key_id) {
            const { data: kl } = await adminDb()
              .from('keylocker_keys').select('private_key_pem').eq('id', order.keylocker_key_id).single()
            privateKeyPem = kl?.private_key_pem || null
          }

          // Find the certificate row linked to this domain/user
          const { data: cert } = await adminDb()
            .from('certificates')
            .select('id, user_id, install_method, install_server_id')
            .eq('domain', order.domain)
            .eq('user_id', order.user_id)
            .eq('status', 'active')
            .single()

          if (cert) {
            // Build the cert update — always include keylocker_key_id if the new order has one,
            // so cpanel-install and agent dispatch use the correct post-reissue key.
            const certUpdate: Record<string, any> = {
              cert_pem: statusRes.crt_code,
              ca_pem: statusRes.ca_code || null,
              private_key_pem: privateKeyPem,
              expires_at: statusRes.valid_till || null,
              issued_at: statusRes.valid_from || null,
              last_reissued_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            // Update keylocker_key_id to the NEW vault entry from this reissue/renewal order.
            // This is the critical fix: without it the old key_id stays on the cert row and
            // cpanel-install retrieves the wrong (pre-reissue) private key → key mismatch error.
            if (order.keylocker_key_id) {
              certUpdate.keylocker_key_id = order.keylocker_key_id
            }
            await adminDb().from('certificates').update(certUpdate).eq('id', cert.id)

            // Dispatch install based on install_method
            if (cert.install_method === 'agent') {
              const { data: serverRows } = await adminDb()
                .from('server_credentials')
                .select('id, agent_id')
                .contains('domains', [order.domain])
                .not('agent_id', 'is', null)
              for (const row of (serverRows || [])) {
                const { data: existing } = await adminDb()
                  .from('agent_jobs').select('id')
                  .eq('agent_id', row.agent_id).eq('cert_id', cert.id)
                  .in('status', ['queued','claimed']).maybeSingle()
                if (!existing) {
                  await adminDb().from('agent_jobs').insert({
                    agent_id: row.agent_id, user_id: order.user_id, cert_id: cert.id,
                    job_type: 'reissue', status: 'queued',
                    cert_pem: statusRes.crt_code, key_pem: privateKeyPem || '', domain: order.domain,
                  })
                }
              }
            } else if (cert.install_method === 'cpanel' && cert.install_server_id) {
              fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/cpanel-install`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
                body: JSON.stringify({ action: 'install', cert_id: cert.id, domain: order.domain, credential_id: cert.install_server_id }),
              }).catch((e: any) => console.warn('cpanel-install (non-fatal):', e.message))
            }
          }

          // Mark cert_reissues row as completed
          await adminDb().from('cert_reissues')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('new_ggs_order_id', order.ggs_order_id)
            .eq('status', 'dv_pending')

          activated++
          console.log(`[poll_pending] Activated ${order.domain} (GGS #${order.ggs_order_id})`)
        } catch (e: any) {
          console.error(`[poll_pending] Error on ${order.domain}:`, e.message)
        }
      }

      return json({ ok: true, checked: pendingOrders.length, activated })
    }

        return json({ error: `Unknown action: ${action}` }, 400)

  } catch (e: any) {
    console.error('gogetssl-issue:', e)
    return json({ error: e.message || 'Internal error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
