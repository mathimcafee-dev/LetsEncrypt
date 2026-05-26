// supabase/functions/cpanel-install/index.ts
// Installs a certificate on a cPanel server via UAPI
// Called by Dashboard after cert is issued by GoGetSSL
//
// POST body:
//   { action: 'install', cert_id, domain, credential_id }
//
// Returns:
//   { ok: true, serial: '...' } on success
//   { ok: false, error: '...' } on failure

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

function adminDb() {
  return createClient(SB_URL, SB_SERVICE)
}

function userDb(token: string) {
  return createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: token } } })
}

// Decrypt credential — credentials stored AES-encrypted in DB
// For now: credentials stored as plaintext JSON { host, port, username, api_token }
// (encryption layer can be added later via KEK)
async function getCredential(credId: string) {
  const db = adminDb()
  const { data, error } = await db
    .from('server_credentials')
    .select('host, port, username, api_token, password, server_type')
    .eq('id', credId)
    .single()
  if (error || !data) throw new Error('Credential not found')
  if (data.server_type !== 'cpanel') throw new Error('Credential is not a cPanel type')
  return data
}

// Call cPanel UAPI
async function cpanelUAPI(
  host: string,
  port: number,
  username: string,
  apiToken: string,
  module: string,
  func: string,
  params: Record<string, string>
) {
  const url = new URL(`https://${host}:${port}/execute/${module}/${func}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `cpanel ${username}:${apiToken}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) throw new Error(`cPanel UAPI HTTP ${res.status}`)
  const data = await res.json()
  if (data.status === 0) throw new Error(data.errors?.[0] || 'cPanel UAPI error')
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const auth = req.headers.get('Authorization') || ''
    const db = userDb(auth)
    const { data: { user } } = await db.auth.getUser()
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action, cert_id, domain, credential_id } = body

    if (action !== 'install') return json({ ok: false, error: `Unknown action: ${action}` })
    if (!cert_id || !domain || !credential_id) {
      return json({ ok: false, error: 'Missing cert_id, domain, or credential_id' })
    }

    // 1. Fetch certificate from DB
    const { data: cert, error: certErr } = await adminDb()
      .from('certificates')
      .select('cert_pem, ca_pem, keylocker_key_id, serial_number, user_id')
      .eq('id', cert_id)
      .single()
    if (certErr || !cert) return json({ ok: false, error: 'Certificate not found in DB' })
    if (cert.user_id !== user.id) return json({ ok: false, error: 'Forbidden' })
    if (!cert.cert_pem) return json({ ok: false, error: 'cert_pem is empty — cert may not be fully issued yet' })

    // 2. Fetch private key from KeyLocker
    let privateKey: string | null = null
    if (cert.keylocker_key_id) {
      const { data: kl } = await adminDb()
        .from('keylocker_keys')
        .select('encrypted_key, encryption_key')
        .eq('id', cert.keylocker_key_id)
        .single()
      if (kl?.encrypted_key) {
        // Keys stored base64-encoded in encrypted_key column
        // Decode — simple base64 for now (full AES-GCM decrypt available via certvault fn)
        privateKey = atob(kl.encrypted_key)
      }
    }
    if (!privateKey) {
      // Fallback: check if key is directly in certificates row (legacy)
      const { data: certFull } = await adminDb()
        .from('certificates')
        .select('private_key_pem')
        .eq('id', cert_id)
        .single()
      privateKey = certFull?.private_key_pem || null
    }
    if (!privateKey) return json({ ok: false, error: 'Private key not available — check KeyLocker' })

    // 3. Fetch cPanel credentials
    const cred = await getCredential(credential_id)
    const port = Number(cred.port) || 2083
    const apiToken = cred.api_token || cred.password

    if (!apiToken) return json({ ok: false, error: 'No API token or password in credential' })

    // 4. Install cert via UAPI SSL::install_ssl
    const caBundle = cert.ca_pem || ''
    await cpanelUAPI(cred.host, port, cred.username, apiToken, 'SSL', 'install_ssl', {
      domain,
      cert: cert.cert_pem,
      key:  privateKey,
      cabundle: caBundle,
    })

    // 5. Mark as live in DB
    await adminDb()
      .from('certificates')
      .update({
        is_live_on_server:   true,
        live_confirmed_by:   'cpanel_install',
        live_confirmed_at:   new Date().toISOString(),
        install_method:      'cpanel',
        updated_at:          new Date().toISOString(),
      })
      .eq('id', cert_id)

    // 6. Log to cert_events
    await adminDb().from('cert_events').insert({
      cert_id,
      user_id: user.id,
      event_type: 'cpanel_installed',
      meta: { domain, host: cred.host, confirmed_by: 'cpanel_install' },
      created_at: new Date().toISOString(),
    }).catch(() => {}) // non-fatal

    return json({
      ok: true,
      serial: cert.serial_number || null,
      domain,
      confirmed_by: 'cpanel_install',
    })

  } catch (e: any) {
    console.error('cpanel-install error:', e)
    return json({ ok: false, error: e.message || 'Internal error' })
  }
})
