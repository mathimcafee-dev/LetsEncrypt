import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MASTER_SECRET = Deno.env.get('KEYLOCKER_MASTER_SECRET') || ''
if (!MASTER_SECRET) {
  console.error('[certvault] FATAL: KEYLOCKER_MASTER_SECRET env var is not set. All encrypt/decrypt operations will fail.')
}

function adminDb() { return createClient(SB_URL, SERVICE_KEY) }

async function getUser(auth: string) {
  const { data: { user } } = await createClient(SB_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
    global: { headers: { Authorization: auth } }
  }).auth.getUser()
  return user
}

// Simple AES-GCM helpers
async function deriveKey(secret: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const raw = await crypto.subtle.importKey('raw', enc.encode(secret + salt), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

async function encrypt(plaintext: string, userId: string): Promise<string> {
  const key = await deriveKey(MASTER_SECRET, userId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  const combined = new Uint8Array(iv.length + enc.byteLength)
  combined.set(iv); combined.set(new Uint8Array(enc), iv.length)
  return btoa(String.fromCharCode(...combined))
}

async function decrypt(ciphertext: string, userId: string): Promise<string> {
  const key = await deriveKey(MASTER_SECRET, userId)
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(dec)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const auth = req.headers.get('Authorization') || ''
    const user = await getUser(auth)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const db = adminDb()
    const body = await req.json()
    const { action, key_id, domain, label, key_material, triggered_by } = body

    if (action === 'list') {
      const { data, error } = await db.from('keylocker_keys')
        .select('id, domain, label, status, created_at, updated_at, last_accessed_at, triggered_by, cert_id')
        .eq('user_id', user.id).neq('status', 'deleted').order('created_at', { ascending: false })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, keys: data || [] })
    }

    if (action === 'fetch') {
      if (!key_id) return json({ error: 'key_id required' }, 400)
      const { data: keyRow, error } = await db.from('keylocker_keys')
        .select('*').eq('id', key_id).eq('user_id', user.id).single()
      if (error || !keyRow) return json({ error: 'Key not found' }, 404)
      if (keyRow.status === 'archived') return json({ error: 'Key is archived' }, 403)

      let pem = ''
      try { pem = await decrypt(keyRow.key_material_encrypted, user.id) }
      catch { return json({ error: 'Failed to decrypt key. Contact support.' }, 500) }

      // Log access
      await db.from('keylocker_audit').insert({
        user_id: user.id, key_id, action: 'reveal', triggered_by: triggered_by || 'user_reveal',
      }).catch(() => {})
      await db.from('keylocker_keys').update({ last_accessed_at: new Date().toISOString() }).eq('id', key_id).catch(() => {})

      return json({ ok: true, pem })
    }

    if (action === 'store') {
      if (!key_material || !domain) return json({ error: 'key_material and domain required' }, 400)
      const encrypted = await encrypt(key_material, user.id)
      const { data, error } = await db.from('keylocker_keys').insert({
        user_id: user.id, domain, label: label || domain,
        key_material_encrypted: encrypted, status: 'active',
        triggered_by: triggered_by || 'manual',
      }).select().single()
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, key_id: data.id })
    }

    if (action === 'archive') {
      if (!key_id) return json({ error: 'key_id required' }, 400)
      const { error } = await db.from('keylocker_keys').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', key_id).eq('user_id', user.id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'dispatch_job') {
      // CertVault uses this to trigger agent cert renewal
      const { domain: d, cert_id, action: job_type } = body
      const agentFn = `${SB_URL}/functions/v1/agent-daemon`
      const { data: { session } } = await createClient(SB_URL, SERVICE_KEY).auth.admin.getUserById(user.id).catch(() => ({ data: { session: null } }))
      // Find first active agent for user
      const { data: agents } = await db.from('persistent_agents').select('id').eq('user_id', user.id).eq('status', 'online').limit(1)
      if (!agents || agents.length === 0) return json({ ok: false, error: 'No active agents found. Install the SSLVault agent on your server.' })
      const { data: job } = await db.from('agent_jobs').insert({
        agent_id: agents[0].id, user_id: user.id, job_type: job_type || 'install_cert',
        domain: d, cert_id: cert_id || null, status: 'queued', created_at: new Date().toISOString(),
      }).select().single().catch(() => ({ data: null }))
      return json({ ok: true, job_id: job?.id })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
})
