// supabase/functions/cpanel-install/index.ts  v2
//
// Installs a certificate on a cPanel server via UAPI over HTTPS.
// Called automatically after cert issuance — zero customer interaction needed.
//
// Flow:
//   1. Fetch cert_pem from certificates table
//   2. Fetch private key via KeyLocker fetch action (proper AES-GCM decrypt)
//   3. Call cPanel UAPI: https://{host}:2083/execute/SSL/install_ssl
//   4. Mark is_live_on_server = true in DB
//
// POST body: { action: 'install', cert_id, domain, credential_id }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SB_ANON    = Deno.env.get('SUPABASE_ANON_KEY')!

function adminDb() { return createClient(SB_URL, SB_SERVICE) }
function userDb(token: string) {
  return createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: token } } })
}

// Call KeyLocker fetch — this handles AES-GCM decryption properly
async function fetchPrivateKey(authToken: string, keyId: string): Promise<string | null> {
  const res = await fetch(`${SB_URL}/functions/v1/keylocker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authToken },
    body: JSON.stringify({ action: 'fetch', key_id: keyId, triggered_by: 'cpanel_auto_install' }),
  })
  const data = await res.json()
  return data.ok ? (data.private_key_pem || null) : null
}

// Call cPanel UAPI over HTTPS — port 2083 standard cPanel SSL port
async function cpanelInstallSSL(
  host: string,
  port: number,
  username: string,
  apiToken: string,
  domain: string,
  certPem: string,
  keyPem: string,
  caBundlePem: string,
): Promise<{ ok: boolean; error?: string }> {

  const url = `https://${host}:${port}/execute/SSL/install_ssl`

  // Build form body — cPanel UAPI accepts application/x-www-form-urlencoded
  const params = new URLSearchParams({
    domain,
    cert:      certPem,
    key:       keyPem,
    cabundle:  caBundlePem,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `cpanel ${username}:${apiToken}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    // Skip TLS cert verification — cPanel servers often have self-signed certs on :2083
    // @ts-ignore Deno-specific
    client: Deno.createHttpClient({ certificateAuthority: null }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status} from cPanel API` }
  }

  const data = await res.json()

  // cPanel UAPI response: { result: { status: 1, errors: [], ... } }
  const status  = data?.result?.status ?? data?.status
  const errors  = data?.result?.errors ?? data?.errors ?? []
  const errMsg  = Array.isArray(errors) && errors.length > 0 ? errors[0] : null

  if (status === 1 || status === true) {
    return { ok: true }
  }
  return { ok: false, error: errMsg || `cPanel returned status ${status}` }
}

// ── Credential decryption ────────────────────────────────────────────
// Matches the encryption used by the server-credentials edge function:
// PBKDF2(secret + userId, salt=userId, 100000 iter, SHA-256) → AES-GCM-256
// Ciphertext format: base64(iv[12] + ciphertext)
async function decryptCredential(encrypted: string, userId: string): Promise<string> {
  const masterSecret = Deno.env.get('KEYLOCKER_MASTER_SECRET') || ''
  if (!masterSecret) throw new Error('KEYLOCKER_MASTER_SECRET not set')
  const enc = new TextEncoder()
  const dec = new TextDecoder()

  const rawBase = await crypto.subtle.importKey('raw', enc.encode(masterSecret + userId), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(userId), iterations: 100000, hash: 'SHA-256' },
    rawBase, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  )
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
  const iv   = combined.slice(0, 12)
  const data = combined.slice(12)
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return dec.decode(pt)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const body0 = await req.clone().json().catch(() => ({}))

    // Support service-role calls from poll_pending (cron/automation context).
    // In that case the caller passes _service_user_id in the body and uses the service role key.
    const isServiceRole = authHeader.includes(SB_SERVICE.slice(0,20)) ||
      (body0._service_user_id && authHeader.startsWith('Bearer '))
    let user: { id: string } | null = null
    if (isServiceRole && body0._service_user_id) {
      user = { id: body0._service_user_id }
    } else {
      const db = userDb(authHeader)
      const { data: { user: u } } = await db.auth.getUser()
      user = u
    }
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action, cert_id, domain, credential_id } = body

    if (action !== 'install') return json({ ok: false, error: `Unknown action: ${action}` })
    if (!cert_id || !domain || !credential_id) {
      return json({ ok: false, error: 'Missing cert_id, domain, or credential_id' })
    }

    // ── 1. Fetch certificate row ─────────────────────────────────────────────
    const { data: cert, error: certErr } = await adminDb()
      .from('certificates')
      .select('cert_pem, ca_pem, keylocker_key_id, serial_number, user_id')
      .eq('id', cert_id)
      .single()

    if (certErr || !cert) return json({ ok: false, error: 'Certificate not found' })
    if (cert.user_id !== user.id) return json({ ok: false, error: 'Forbidden' })
    if (!cert.cert_pem) return json({ ok: false, error: 'cert_pem empty — cert may not be fully issued yet' })

    // ── 2. Fetch private key via KeyLocker (handles AES-GCM decryption) ──────
    let privateKey: string | null = null

    if (cert.keylocker_key_id) {
      privateKey = await fetchPrivateKey(authHeader, cert.keylocker_key_id)
    }

    // Fallback: legacy direct storage in certificates table
    if (!privateKey) {
      const { data: legacyRow } = await adminDb()
        .from('certificates')
        .select('private_key_pem')
        .eq('id', cert_id)
        .single()
      privateKey = legacyRow?.private_key_pem || null
    }

    if (!privateKey) {
      return json({ ok: false, error: 'Private key not available — check KeyLocker' })
    }

    // ── 3. Fetch cPanel credentials ──────────────────────────────────────────
    // Actual schema columns: host, cpanel_hostname, port, cpanel_port, username,
    // credentials_enc (encrypted JSON containing api_token), cpanel_api_token_enc
    const { data: cred, error: credErr } = await adminDb()
      .from('server_credentials')
      .select('host, cpanel_hostname, port, cpanel_port, username, server_type, credentials_enc, cpanel_api_token_enc, user_id')
      .eq('id', credential_id)
      .single()

    if (credErr || !cred) return json({ ok: false, error: 'Credential not found' })
    if (cred.server_type && !['cpanel', 'shared'].includes(cred.server_type)) {
      return json({ ok: false, error: `Credential type '${cred.server_type}' is not cPanel` })
    }

    const host   = cred.cpanel_hostname || cred.host
    const port   = Number(cred.cpanel_port || cred.port) || 2083
    const cpUser = cred.username

    // Decrypt credentials — stored as AES-GCM encrypted JSON via certvault encrypt scheme
    // Format: PBKDF2(KEYLOCKER_MASTER_SECRET + user_id) → AES-GCM → base64(iv + ciphertext)
    let apiToken: string | null = null

    if (cred.cpanel_api_token_enc) {
      // Dedicated encrypted token column
      try { apiToken = await decryptCredential(cred.cpanel_api_token_enc, cred.user_id || user.id) } catch {}
    }

    if (!apiToken && cred.credentials_enc) {
      // Encrypted JSON blob: { api_token: "...", password: "..." }
      try {
        const decrypted = await decryptCredential(cred.credentials_enc, cred.user_id || user.id)
        const parsed = JSON.parse(decrypted)
        apiToken = parsed.api_token || parsed.password || parsed.token || null
      } catch {}
    }

    // Allow inline credentials from wizard (new server path: no credential saved yet)
    if (!apiToken && body.api_token) {
      apiToken = body.api_token
    }
    if (!host && body.hostname) {
      // hostname is passed inline from wizard for new/unsaved servers
    }
    const finalHost   = host || body.hostname || null
    const finalUser   = cpUser || body.cpanel_user || null
    const finalToken  = apiToken || body.api_token || null
    const finalPort   = port || body.port || 2083

    if (!finalHost || !finalUser || !finalToken) {
      return json({ ok: false, error: `Missing credentials — host:${!!finalHost} user:${!!finalUser} token:${!!finalToken}. Check server credentials in Integrations.` })
    }

    // ── 4. Call cPanel UAPI SSL/install_ssl ──────────────────────────────────
    const installResult = await cpanelInstallSSL(
      finalHost, finalPort, finalUser, finalToken,
      domain,
      cert.cert_pem,
      privateKey,
      cert.ca_pem || '',
    )

    if (!installResult.ok) {
      return json({ ok: false, error: installResult.error || 'cPanel install failed' })
    }

    // ── 5. Mark as live in DB ────────────────────────────────────────────────
    await adminDb()
      .from('certificates')
      .update({
        is_live_on_server: true,
        live_confirmed_by: 'cpanel_install',
        live_confirmed_at: new Date().toISOString(),
        install_method:    'cpanel',
        updated_at:        new Date().toISOString(),
      })
      .eq('id', cert_id)

    // ── 6. Log to cert_events ────────────────────────────────────────────────
    await adminDb().from('cert_events').insert({
      cert_id,
      user_id:    user.id,
      event_type: 'cpanel_installed',
      meta:       { domain, host: finalHost, confirmed_by: 'cpanel_install' },
      created_at: new Date().toISOString(),
    }).catch(() => {})

    return json({
      ok:           true,
      serial:       cert.serial_number || null,
      domain,
      confirmed_by: 'cpanel_install',
    })

  } catch (e: any) {
    console.error('cpanel-install v2 error:', e)
    return json({ ok: false, error: e.message || 'Internal error' })
  }
})
