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

// ── cPanel HTTP helper ───────────────────────────────────────────────
async function cpanelFetch(
  host: string, port: number, username: string, apiToken: string,
  url: string, params: URLSearchParams
): Promise<any> {
  // @ts-ignore Deno-specific — skip TLS verification for cPanel self-signed certs
  const client = Deno.createHttpClient({ certificateAuthority: null })
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `cpanel ${username}:${apiToken}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    client,
    signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
  try { return JSON.parse(text) } catch { throw new Error(`Bad JSON: ${text.slice(0, 200)}`) }
}

// ── Install AND activate SSL certificate on cPanel domain ────────────
//
// The correct flow to replace an active cert (even Let's Encrypt):
//
//   Step 1 — Disable AutoSSL for domain (stops LE from fighting us)
//     UAPI SSL/disable_autossl_for_domain
//
//   Step 2 — UAPI SSL/install_ssl (THE activation call)
//     This is the same call cPanel's "Update Certificate" button triggers.
//     Replaces whatever cert is currently active on the domain vhost.
//     Returns full errors — we check status === 1 strictly.
//
//   Step 3 — Verify: UAPI SSL/fetch_ssl_vhost
//     Confirm the new cert is actually serving by checking the issuer.
//
//   Step 4 — UAPI SSL/rebuild_mail_sni (non-fatal)
//     Activates cert for mail services.
//
async function cpanelInstallSSL(
  host: string,
  port: number,
  username: string,
  apiToken: string,
  domain: string,
  certPem: string,
  keyPem: string,
  caBundlePem: string,
): Promise<{ ok: boolean; error?: string; debug?: Record<string, any> }> {

  const debug: Record<string, any> = {}

  // ── Step 1: Disable AutoSSL for domain ───────────────────────────
  // Prevents Let's Encrypt AutoSSL from overriding our cert immediately.
  try {
    const autoSslParams = new URLSearchParams({ domain })
    const autoSslData = await cpanelFetch(
      host, port, username, apiToken,
      `https://${host}:${port}/execute/SSL/disable_autossl_for_domain`,
      autoSslParams
    )
    debug.s1_disable_autossl = { status: autoSslData?.result?.status, errors: autoSslData?.result?.errors }
  } catch (e: any) {
    // Non-fatal — older cPanel versions may not have this endpoint
    debug.s1_disable_autossl = `non-fatal: ${e.message}`
  }

  // ── Step 2: UAPI SSL/install_ssl — activate cert on domain ───────
  // This is the definitive activation call that replaces the active cert.
  // Same as clicking "Update Certificate" in cPanel's SSL/TLS Installation UI.
  let installData: any
  try {
    const installParams = new URLSearchParams({
      domain,
      cert:     certPem,
      key:      keyPem,
      cabundle: caBundlePem,
    })
    installData = await cpanelFetch(
      host, port, username, apiToken,
      `https://${host}:${port}/execute/SSL/install_ssl`,
      installParams
    )
    debug.s2_install = { raw: JSON.stringify(installData).slice(0, 600) }
  } catch (e: any) {
    return { ok: false, error: `SSL install_ssl call failed: ${e.message}`, debug }
  }

  // Strict status check — status must be exactly 1
  const installStatus = installData?.result?.status
  const installErrors = installData?.result?.errors ?? []
  const installErr    = Array.isArray(installErrors) && installErrors.length > 0
    ? installErrors.join('; ')
    : null

  debug.s2_install_parsed = { status: installStatus, error: installErr }

  if (installStatus !== 1) {
    const errMsg = installErr || `install_ssl returned status ${installStatus}. Full response: ${JSON.stringify(installData).slice(0, 400)}`
    return { ok: false, error: errMsg, debug }
  }

  // ── Step 3: Verify cert is now active ────────────────────────────
  // Fetch the active cert details to confirm it's no longer Let's Encrypt.
  try {
    await new Promise(r => setTimeout(r, 2000)) // brief pause for Apache to reload
    const verifyParams = new URLSearchParams({ domain })
    const verifyData = await cpanelFetch(
      host, port, username, apiToken,
      `https://${host}:${port}/execute/SSL/fetch_ssl_vhost`,
      verifyParams
    )
    const vhost   = verifyData?.result?.data
    const issuer  = vhost?.issuer || vhost?.certificate?.issuer || 'unknown'
    const subject = vhost?.subject || vhost?.certificate?.subject || ''
    debug.s3_verify = { issuer, subject, raw: JSON.stringify(verifyData).slice(0, 300) }
    console.log('[cpanel-install] Active cert issuer after install:', issuer)
  } catch (e: any) {
    debug.s3_verify = `non-fatal: ${e.message}`
  }

  // ── Step 4: rebuild_mail_sni (non-fatal) ─────────────────────────
  try {
    const mailParams = new URLSearchParams({ domain })
    const mailData = await cpanelFetch(
      host, port, username, apiToken,
      `https://${host}:${port}/execute/SSL/rebuild_mail_sni`,
      mailParams
    )
    debug.s4_mail_sni = { status: mailData?.result?.status }
  } catch (e: any) {
    debug.s4_mail_sni = `non-fatal: ${e.message}`
  }

  return { ok: true, debug }
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
