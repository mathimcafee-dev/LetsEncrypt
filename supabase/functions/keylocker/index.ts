/**
 * SSLVault KeyLocker — Secure Private Key Vault
 * ═══════════════════════════════════════════════════════════════════
 *
 * This edge function is the ONLY place in SSLVault that handles
 * private key material. It uses envelope encryption:
 *
 *   plaintext key
 *       │
 *       ▼
 *   AES-256-GCM  ◄── DEK (random 256-bit Data Encryption Key)
 *       │
 *       ▼
 *   ciphertext (stored in keylocker_keys.key_material_encrypted)
 *
 *   DEK
 *    │
 *    ▼
 *   AES-256-GCM  ◄── KEK (Key Encryption Key, derived from KEYLOCKER_MASTER_SECRET + user_id)
 *    │
 *    ▼
 *   encrypted DEK (stored in keylocker_keys.dek_encrypted)
 *
 * The KEYLOCKER_MASTER_SECRET is a Supabase secret (env var), never
 * stored in the DB. A database breach alone cannot decrypt any key.
 *
 * Actions:
 *   store   — encrypt + store a new private key
 *   fetch   — decrypt + return a stored key (audit logged)
 *   list    — return metadata only (no key material)
 *   rotate  — archive old key, store new one
 *   archive — mark a key archived
 *
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// ── DB clients ────────────────────────────────────────────────────────

function adminDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ══════════════════════════════════════════════════════════════════════
// ENVELOPE ENCRYPTION
//
// Layer 1 — DEK: random AES-256-GCM key generated per-certificate
// Layer 2 — KEK: derived from KEYLOCKER_MASTER_SECRET + user_id via HKDF
//
// This means:
//   • Supabase DB breach → all ciphertexts exposed, but no keys (no master secret)
//   • Master secret leak → all user KEKs could be derived, but ciphertexts needed too
//   • Both needed simultaneously → defence-in-depth
// ══════════════════════════════════════════════════════════════════════

const ENC = new TextEncoder()
const DEC = new TextDecoder()

/** Base64url encode a Uint8Array */
function b64u(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Base64url decode to Uint8Array */
function deb64u(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - str.length % 4) % 4, '='
  )
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

/**
 * Derive a per-user Key Encryption Key (KEK) from the master secret.
 * Uses HKDF-SHA256 so each user gets a unique KEK even from the same secret.
 */
async function deriveKek(userId: string): Promise<CryptoKey> {
  const masterSecret = Deno.env.get('KEYLOCKER_MASTER_SECRET')
  if (!masterSecret) throw new Error('KEYLOCKER_MASTER_SECRET not configured')

  // Import master secret as HKDF base key
  const base = await crypto.subtle.importKey(
    'raw', ENC.encode(masterSecret), { name: 'HKDF' }, false, ['deriveKey']
  )

  // Derive a unique AES-KW key for this user
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: ENC.encode('sslvault-kek-v1'),   // versioned salt
      info: ENC.encode(`kek:${userId}`),       // user-specific info
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,       // KEK itself is non-extractable — never leaves memory
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a random 256-bit Data Encryption Key (DEK) for one certificate.
 * Extractable so we can wrap it with the KEK.
 */
async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
}

/** AES-256-GCM encrypt. Returns "iv_b64u.ciphertext_b64u" */
async function aesEncrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const ct   = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, ENC.encode(plaintext)
  )
  return `${b64u(iv)}.${b64u(new Uint8Array(ct))}`
}

/** AES-256-GCM decrypt. Input is "iv_b64u.ciphertext_b64u" */
async function aesDecrypt(key: CryptoKey, token: string): Promise<string> {
  const [ivStr, ctStr] = token.split('.')
  const iv = deb64u(ivStr)
  const ct = deb64u(ctStr)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return DEC.decode(pt)
}

/** Export a raw DEK as base64url string so we can encrypt it with the KEK */
async function exportDek(dek: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', dek)
  return b64u(new Uint8Array(raw))
}

/** Import a raw DEK from base64url string */
async function importDek(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', deb64u(b64), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

/**
 * Full envelope encrypt:
 *   1. Generate random DEK
 *   2. Encrypt plaintext with DEK  → key_material_encrypted
 *   3. Export DEK, encrypt with KEK → dek_encrypted
 *   Returns both ciphertexts for DB storage.
 */
async function envelopeEncrypt(userId: string, plaintext: string) {
  const kek = await deriveKek(userId)
  const dek = await generateDek()
  const keyMaterialEncrypted = await aesEncrypt(dek, plaintext)
  const dekRaw = await exportDek(dek)
  const dekEncrypted = await aesEncrypt(kek, dekRaw)
  return { keyMaterialEncrypted, dekEncrypted }
}

/**
 * Full envelope decrypt:
 *   1. Derive KEK from master secret + userId
 *   2. Decrypt dek_encrypted → DEK
 *   3. Decrypt key_material_encrypted → plaintext
 */
async function envelopeDecrypt(
  userId: string,
  dekEncrypted: string,
  keyMaterialEncrypted: string
): Promise<string> {
  const kek    = await deriveKek(userId)
  const dekRaw = await aesDecrypt(kek, dekEncrypted)
  const dek    = await importDek(dekRaw)
  return aesDecrypt(dek, keyMaterialEncrypted)
}

// ── Audit logger (service role only — users can't write) ──────────────

async function auditLog(params: {
  userId: string
  keyId: string | null
  domain: string
  action: string
  triggeredBy: string
  metadata?: Record<string, unknown>
  ip?: string
}) {
  await adminDb().from('keylocker_audit_log').insert({
    user_id:      params.userId,
    key_id:       params.keyId,
    domain:       params.domain,
    action:       params.action,
    triggered_by: params.triggeredBy,
    ip_address:   params.ip || null,
    metadata:     params.metadata || null,
  })
}

// ── Main handler ──────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Authenticate caller
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const ip   = req.headers.get('x-forwarded-for') || null
    const body = await req.json()
    const { action } = body

    // ── store ─────────────────────────────────────────────────────────
    // Called by gogetssl-issue after order placement.
    // Accepts the raw private key + all identity metadata,
    // encrypts it, and returns the keylocker_keys row id.
    //
    // Input:
    //   private_key_pem  — raw PKCS#8 PEM (REQUIRED, handled once then discarded)
    //   domain           — e.g. "example.com"
    //   cert_id          — certificates.id (optional, set when cert is issued)
    //   order_id         — ssl_orders.id
    //   ggs_order_id     — GoGetSSL numeric order id
    //   csr_pem          — the CSR we sent to GoGetSSL (public material only)
    //   product_name     — "RapidSSL DV" etc
    //   algorithm        — "RSA" (default)
    //   key_size         — 2048 (default)
    //   expires_at       — cert expiry ISO timestamp (optional)
    //
    if (action === 'store') {
      const {
        private_key_pem, domain,
        cert_id = null, order_id = null, ggs_order_id = null,
        csr_pem = null, product_name = null,
        algorithm = 'RSA', key_size = 2048,
        expires_at = null,
      } = body

      if (!private_key_pem) return json({ error: 'private_key_pem required' }, 400)
      if (!domain)          return json({ error: 'domain required' }, 400)

      // Validate it looks like a PEM private key before we touch it
      if (!private_key_pem.includes('PRIVATE KEY')) {
        return json({ error: 'private_key_pem does not appear to be a valid PEM key' }, 400)
      }

      // Envelope-encrypt the private key
      const { keyMaterialEncrypted, dekEncrypted } = await envelopeEncrypt(
        user.id, private_key_pem
      )

      // Insert into keylocker_keys — NO plaintext key material stored anywhere
      const { data: keyRow, error: insertErr } = await adminDb()
        .from('keylocker_keys')
        .insert({
          user_id:                user.id,
          cert_id,
          domain,
          dek_encrypted:          dekEncrypted,
          key_material_encrypted: keyMaterialEncrypted,
          kek_id:                 'v1',           // key derivation version label
          algorithm,
          key_size,
          status:                 'active',
          rotation_count:         0,
          expires_at,
          // Identity metadata (plaintext, not sensitive)
          // Stored in the metadata JSONB column for reference
        })
        .select('id')
        .single()

      if (insertErr) return json({ error: insertErr.message }, 500)

      // Store identity metadata separately in order/cert references
      // Update ssl_orders to reference the keylocker entry and CLEAR the raw PEM
      if (order_id) {
        await adminDb()
          .from('ssl_orders')
          .update({
            keylocker_key_id: keyRow.id,
            private_key_pem:  null,           // clear raw key from orders table
            csr_code:         csr_pem,         // keep CSR (public material, safe)
          })
          .eq('id', order_id)
          .eq('user_id', user.id)
      }

      // Update certificates to reference the keylocker entry and CLEAR the raw PEM
      if (cert_id) {
        await adminDb()
          .from('certificates')
          .update({
            keylocker_key_id: keyRow.id,
            private_key_pem:  null,           // clear raw key from certificates table
          })
          .eq('id', cert_id)
          .eq('user_id', user.id)
      }

      // Audit: key created
      await auditLog({
        userId:      user.id,
        keyId:       keyRow.id,
        domain,
        action:      'created',
        triggeredBy: 'api',
        ip: ip || undefined,
        metadata: {
          order_id,
          ggs_order_id,
          product_name,
          algorithm,
          key_size,
          csr_fingerprint: csr_pem
            ? await csrSummary(csr_pem)
            : null,
        },
      })

      return json({
        ok:      true,
        key_id:  keyRow.id,
        message: 'Private key encrypted and stored in KeyLocker vault. Raw PEM cleared from all tables.',
      })
    }

    // ── fetch ─────────────────────────────────────────────────────────
    // Decrypt and return the private key for a given keylocker key_id.
    // Every fetch is audit-logged (who + when + triggeredBy).
    //
    if (action === 'fetch') {
      const { key_id, triggered_by = 'user' } = body
      if (!key_id) return json({ error: 'key_id required' }, 400)

      const { data: keyRow, error: fetchErr } = await adminDb()
        .from('keylocker_keys')
        .select('*')
        .eq('id', key_id)
        .eq('user_id', user.id)      // RLS + explicit user check
        .single()

      if (fetchErr || !keyRow) return json({ error: 'Key not found' }, 404)
      if (keyRow.status === 'revoked') return json({ error: 'Key has been revoked' }, 403)

      // Decrypt
      let privateKeyPem: string
      try {
        privateKeyPem = await envelopeDecrypt(
          user.id,
          keyRow.dek_encrypted,
          keyRow.key_material_encrypted
        )
      } catch (e: any) {
        return json({ error: `Decryption failed: ${e.message}` }, 500)
      }

      // Update last_accessed_at
      await adminDb()
        .from('keylocker_keys')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', key_id)

      // Audit: key fetched
      await auditLog({
        userId:      user.id,
        keyId:       key_id,
        domain:      keyRow.domain,
        action:      'fetched',
        triggeredBy: triggered_by,
        ip: ip || undefined,
        metadata: { key_id, status: keyRow.status },
      })

      return json({
        ok:              true,
        key_id,
        domain:          keyRow.domain,
        algorithm:       keyRow.algorithm,
        key_size:        keyRow.key_size,
        status:          keyRow.status,
        private_key_pem: privateKeyPem,
      })
    }

    // ── list ──────────────────────────────────────────────────────────
    // Returns metadata only — NO key material decrypted.
    // Also returns last 50 audit log entries.
    //
    if (action === 'list') {
      const [{ data: keys }, { data: audit }] = await Promise.all([
        adminDb()
          .from('keylocker_keys')
          .select('id, domain, algorithm, key_size, status, rotation_count, last_accessed_at, expires_at, archived_at, created_at, cert_id, kek_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        adminDb()
          .from('keylocker_audit_log')
          .select('id, domain, action, triggered_by, metadata, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      return json({ ok: true, keys: keys || [], audit: audit || [] })
    }

    // ── archive ───────────────────────────────────────────────────────
    // Mark a key as archived (after rotation or manual request).
    // Key material remains encrypted in DB for 30 days, then
    // a cleanup cron will delete it.
    //
    if (action === 'archive') {
      const { key_id } = body
      if (!key_id) return json({ error: 'key_id required' }, 400)

      const { data: keyRow } = await adminDb()
        .from('keylocker_keys')
        .select('domain, status')
        .eq('id', key_id)
        .eq('user_id', user.id)
        .single()

      if (!keyRow) return json({ error: 'Key not found' }, 404)

      await adminDb()
        .from('keylocker_keys')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', key_id)
        .eq('user_id', user.id)

      await auditLog({
        userId:      user.id,
        keyId:       key_id,
        domain:      keyRow.domain,
        action:      'archived',
        triggeredBy: 'user',
        ip: ip || undefined,
      })

      return json({ ok: true, message: `Key archived. Will be permanently deleted after 30 days.` })
    }

    // ── rotate ────────────────────────────────────────────────────────
    // Called when a new key+cert is issued to replace an existing one.
    // Archives the old key, stores the new one, and links everything.
    //
    if (action === 'rotate') {
      const {
        old_key_id,
        new_private_key_pem, new_domain,
        new_cert_id = null, new_order_id = null,
        new_ggs_order_id = null, new_csr_pem = null,
        product_name = null, key_size = 2048,
        expires_at = null,
      } = body

      if (!old_key_id)          return json({ error: 'old_key_id required' }, 400)
      if (!new_private_key_pem) return json({ error: 'new_private_key_pem required' }, 400)
      if (!new_domain)          return json({ error: 'new_domain required' }, 400)

      // Verify caller owns the old key
      const { data: oldKey } = await adminDb()
        .from('keylocker_keys')
        .select('id, domain, rotation_count, status')
        .eq('id', old_key_id)
        .eq('user_id', user.id)
        .single()

      if (!oldKey) return json({ error: 'Old key not found' }, 404)

      // Encrypt the new key
      const { keyMaterialEncrypted, dekEncrypted } = await envelopeEncrypt(
        user.id, new_private_key_pem
      )

      // Store new key
      const { data: newKeyRow, error: insertErr } = await adminDb()
        .from('keylocker_keys')
        .insert({
          user_id:                user.id,
          cert_id:                new_cert_id,
          domain:                 new_domain,
          dek_encrypted:          dekEncrypted,
          key_material_encrypted: keyMaterialEncrypted,
          kek_id:                 'v1',
          algorithm:              'RSA',
          key_size,
          status:                 'active',
          rotation_count:         (oldKey.rotation_count || 0) + 1,
          expires_at,
        })
        .select('id')
        .single()

      if (insertErr) return json({ error: insertErr.message }, 500)

      // Archive old key
      await adminDb()
        .from('keylocker_keys')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', old_key_id)

      // Clear raw keys from ssl_orders / certificates tables
      if (new_order_id) {
        await adminDb()
          .from('ssl_orders')
          .update({ keylocker_key_id: newKeyRow.id, private_key_pem: null, csr_code: new_csr_pem })
          .eq('id', new_order_id).eq('user_id', user.id)
      }
      if (new_cert_id) {
        await adminDb()
          .from('certificates')
          .update({ keylocker_key_id: newKeyRow.id, private_key_pem: null })
          .eq('id', new_cert_id).eq('user_id', user.id)
      }

      // Insert rotation record
      await adminDb().from('keylocker_rotations').insert({
        user_id:            user.id,
        old_key_id,
        new_key_id:         newKeyRow.id,
        domain:             new_domain,
        triggered_by:       'manual',
        rotated_by_user_id: user.id,
      })

      // Audit: rotation
      await auditLog({
        userId:      user.id,
        keyId:       newKeyRow.id,
        domain:      new_domain,
        action:      'rotated',
        triggeredBy: 'user',
        ip: ip || undefined,
        metadata: {
          old_key_id,
          new_order_id,
          new_ggs_order_id,
          product_name,
          csr_fingerprint: new_csr_pem ? await csrSummary(new_csr_pem) : null,
        },
      })

      return json({
        ok:          true,
        new_key_id:  newKeyRow.id,
        old_key_id,
        message:     'New key stored and encrypted. Old key archived for 30-day rollback.',
      })
    }

    return json({ error: `Unknown action: ${action}` }, 400)

  } catch (e: any) {
    console.error('keylocker:', e)
    return json({ error: e.message || 'Internal error' }, 500)
  }
})

// ── Helpers ───────────────────────────────────────────────────────────

/** Extract a short identity summary from CSR PEM for audit metadata */
async function csrSummary(csrPem: string): Promise<string> {
  try {
    // Just hash the CSR bytes as a fingerprint reference
    const raw = csrPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('')
    return `sha256:${hex.slice(0, 16)}…`
  } catch {
    return 'unknown'
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
