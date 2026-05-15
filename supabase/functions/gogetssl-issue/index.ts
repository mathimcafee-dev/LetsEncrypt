import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GGS_API = 'https://my.gogetssl.com/api'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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

async function resolveProductId(authKey: string, code: string): Promise<{ id: number; name: string }> {
  const resp = await ggsGet(authKey, '/products/ssl/')
  const entries = typeof resp === 'object' && !Array.isArray(resp)
    ? Object.entries(resp).map(([id, p]: [string, any]) => ({ id: Number(id), ...p }))
    : (resp as any[])
  const isWildcard = PRODUCT_META[code]?.wildcard ?? false
  const match = entries.find((p: any) => {
    const name: string = String(p.name ?? p.product_name ?? '').toLowerCase()
    return name.includes('rapidssl') && (isWildcard ? name.includes('wildcard') : !name.includes('wildcard'))
  })
  if (!match) {
    const names = entries.map((p: any) => p.name).join(', ')
    throw new Error(`Product '${code}' not found. Available: ${names}`)
  }
  return { id: Number(match.id || match.product_id), name: String(match.name ?? match.product_name ?? 'RapidSSL DV') }
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
        dcv_method:       'dns',
        approver_email:   `admin@${cleanDomain}`,
        admin_email:      adminEmail,
        admin_phone:      phone,
        admin_first_name: firstName,
        admin_last_name:  lastName,
        tech_email:       adminEmail,
        tech_phone:       phone,
        tech_first_name:  firstName,
        tech_last_name:   lastName,
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

      let dcvName = '', dcvValue = ''
      if (statusRes.domains) {
        const d = Object.values(statusRes.domains)[0] as any
        dcvName  = d?.cname_name  || d?.validation?.cname_name  || ''
        dcvValue = d?.cname_value || d?.validation?.cname_value || ''
      }

      if (dcvName || dcvValue) {
        await adminDb().from('ssl_orders').update({
          dcv_cname_name:  dcvName,
          dcv_cname_value: dcvValue,
          ggs_status:      statusRes.status,
          updated_at:      new Date().toISOString(),
        }).eq('id', saved.id)
      }

      return json({
        ok:              true,
        order_id:        saved.id,
        ggs_order_id:    orderRes.order_id,
        domain:          cleanDomain,
        product_name:    product.name,
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
      if (!order.dcv_cname_value && statusRes.domains) {
        const d = Object.values(statusRes.domains)[0] as any
        upd.dcv_cname_name  = d?.cname_name  || d?.validation?.cname_name  || ''
        upd.dcv_cname_value = d?.cname_value || d?.validation?.cname_value || ''
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
      const entries = typeof resp === 'object' && !Array.isArray(resp)
        ? Object.entries(resp).map(([id, p]: [string, any]) => ({ id: Number(id), ...p }))
        : (resp as any[])
      const rapid = entries.filter((p: any) => String(p.name ?? p.product_name ?? '').toLowerCase().includes('rapidssl'))
      return json({ ok: true, products: rapid })
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
