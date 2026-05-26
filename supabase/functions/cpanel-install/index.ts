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
  'Access-Control-Allow-Headers': 'authorization, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const db = userDb(authHeader)
    const { data: { user } } = await db.auth.getUser()
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
    const { data: cred, error: credErr } = await adminDb()
      .from('server_credentials')
      .select('host, hostname, port, username, cpanel_user, api_token, password, server_type')
      .eq('id', credential_id)
      .single()

    if (credErr || !cred) return json({ ok: false, error: 'Credential not found' })
    if (cred.server_type && !['cpanel', 'shared'].includes(cred.server_type)) {
      return json({ ok: false, error: `Credential type '${cred.server_type}' is not cPanel` })
    }

    const host      = cred.hostname || cred.host
    const port      = Number(cred.port) || 2083
    const cpUser    = cred.cpanel_user || cred.username
    const apiToken  = cred.api_token || cred.password

    if (!host || !cpUser || !apiToken) {
      return json({ ok: false, error: 'Missing host, cpanel_user, or api_token in credential' })
    }

    // ── 4. Call cPanel UAPI SSL/install_ssl ──────────────────────────────────
    const installResult = await cpanelInstallSSL(
      host, port, cpUser, apiToken,
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
      meta:       { domain, host, confirmed_by: 'cpanel_install' },
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
