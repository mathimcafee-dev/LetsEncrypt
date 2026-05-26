// SSLVault Auto-Renewal Cron
// Handles three cert types:
//   1. GGS paid certs (ggs_order_id IS NOT NULL): auto-reissue via gogetssl-issue, poll for active, dispatch to agent
//   2. ACME free certs (session_id, no ggs_order_id): renew via acme-ssl
//   3. TSS sandbox certs (is_sandbox=true): rotate via tss-issue
// Runs every 30 minutes via Supabase pg_cron.
//
// Schedule:  "*/30 * * * *"
// command:  select net.http_post(url := 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/auto-renew-cron', headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.cron_secret')))::text;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL      = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL') || 'https://frthcwkntciaakqsppss.supabase.co'
const SERVICE_ROLE_KEY  = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ACME_URL          = Deno.env.get('ACME_FUNCTION_URL')  || `${SUPABASE_URL}/functions/v1/acme-ssl`
const TSS_URL           = Deno.env.get('TSS_FUNCTION_URL')   || `${SUPABASE_URL}/functions/v1/tss-issue`
const GGS_ISSUE_URL     = `${SUPABASE_URL}/functions/v1/gogetssl-issue`

if (!SERVICE_ROLE_KEY) console.error('FATAL: SERVICE_ROLE_KEY missing')

// GGS certs: reissue 30 days before cert expires_at
// ACME/normal: renew 14 days before
// Sandbox: renew 40 hours before
const GGS_REISSUE_WINDOW_DAYS  = 30
const RENEWAL_WINDOW_DAYS      = 14
const SANDBOX_RENEWAL_HOURS    = 40
const MAX_ATTEMPTS  = 5
const BACKOFF_HOURS = [0, 6, 24, 72, 168]

// GGS: poll for DCV+issuance up to 10 minutes
const GGS_POLL_INTERVAL_MS = 8000
const GGS_POLL_MAX_MS      = 10 * 60 * 1000

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

interface Certificate {
  id: string
  user_id: string
  domain: string
  session_id: string | null
  expires_at: string
  auto_renew_enabled: boolean
  auto_renew_attempt_count: number
  last_renewal_attempt_at: string | null
  dns_provider_id: string | null
  status: string
  is_sandbox: boolean
  cert_type: string | null
  ggs_order_id: number | null
  install_method: string | null
  tss_order_id: string | null
  years: number | null
  first_name: string | null
  last_name: string | null
  admin_email: string | null
  phone: string | null
}

async function logEvent(certId: string | null, userId: string, eventType: string, details: Record<string, unknown> = {}) {
  try {
    await supabase.from('renewal_events').insert({ cert_id: certId, user_id: userId, event_type: eventType, details })
  } catch (err) { console.error('logEvent failed', err) }
}

function shouldAttemptRetry(cert: Certificate): boolean {
  if (cert.auto_renew_attempt_count >= MAX_ATTEMPTS) return false
  if (!cert.last_renewal_attempt_at) return true
  const lastAttempt = new Date(cert.last_renewal_attempt_at).getTime()
  const backoffHours = BACKOFF_HOURS[Math.min(cert.auto_renew_attempt_count, BACKOFF_HOURS.length - 1)]
  return Date.now() >= lastAttempt + backoffHours * 3600000
}

// ── Reissue a GGS paid cert ───────────────────────────────────────────
// Calls gogetssl-issue with action='reissue', which:
//   1. Generates new CSR+key
//   2. Places a new GGS order on the existing subscription
//   3. Auto-adds DNS TXT record for DCV
//   4. Returns the new ssl_orders row id + ggs_order_id
// We then poll ssl_orders until status='active', fetch the cert_pem,
// update the certificates row, and dispatch to agent.
async function renewGgs(cert: Certificate): Promise<{ ok: boolean; error?: string }> {
  console.log(`[GGS] Starting reissue for ${cert.domain} (cert ${cert.id})`)

  // Step 1: Call gogetssl-issue
  const issueRes = await fetch(GGS_ISSUE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ action: 'reissue', cert_id: cert.id, triggered_by: 'auto_cron' })
  })
  const issueData = await issueRes.json().catch(() => ({}))

  if (!issueRes.ok || !issueData.ok) {
    return { ok: false, error: issueData.error || `gogetssl-issue HTTP ${issueRes.status}` }
  }

  const newOrderId: number = issueData.ggs_order_id
  const newSslRowId: string = issueData.order_id  // ssl_orders UUID
  console.log(`[GGS] New order placed: GGS #${newOrderId}, row ${newSslRowId}`)

  // Step 2: Poll ssl_orders until status='active' (DCV passed + cert issued)
  const pollStart = Date.now()
  let activeOrder: Record<string, unknown> | null = null

  while (Date.now() - pollStart < GGS_POLL_MAX_MS) {
    await new Promise(r => setTimeout(r, GGS_POLL_INTERVAL_MS))

    const { data: orders } = await supabase
      .from('ssl_orders')
      .select('id, status, cert_pem, ca_pem, valid_till, ggs_order_id, private_key_pem')
      .eq('id', newSslRowId)
      .limit(1)

    const order = orders?.[0]
    if (order?.status === 'active') {
      activeOrder = order
      break
    }
    const elapsed = Math.round((Date.now() - pollStart) / 1000)
    console.log(`[GGS] ${cert.domain} still ${order?.status || 'unknown'} after ${elapsed}s`)
  }

  if (!activeOrder) {
    return { ok: false, error: `GGS DCV/issuance timed out after ${GGS_POLL_MAX_MS / 60000} minutes for ${cert.domain}` }
  }

  console.log(`[GGS] Order active for ${cert.domain}. Updating certificate row.`)

  // Step 3: Update the certificates row with new cert data
  const newExpiry = activeOrder.valid_till
    ? new Date(activeOrder.valid_till as string).toISOString()
    : new Date(Date.now() + 365 * 86400000).toISOString()

  const { error: updateErr } = await supabase.from('certificates').update({
    cert_pem:                activeOrder.cert_pem || null,
    ca_pem:                  activeOrder.ca_pem || null,
    private_key_pem:         activeOrder.private_key_pem || null,
    issued_at:               new Date().toISOString(),
    expires_at:              newExpiry,
    status:                  'active',
    ggs_order_id:            newOrderId,
    last_reissued_at:        new Date().toISOString(),
    reissue_count:           (cert as any).reissue_count ? (cert as any).reissue_count + 1 : 1,
    auto_renew_attempt_count: 0,
    last_renewal_attempt_at: new Date().toISOString(),
    last_renewal_status:     'success',
    last_renewal_error:      null,
    updated_at:              new Date().toISOString(),
  }).eq('id', cert.id)

  if (updateErr) return { ok: false, error: `DB update failed: ${updateErr.message}` }

  // Step 4: Dispatch to agent
  await dispatchToAllAgents(cert, {
    cert_pem:        activeOrder.cert_pem,
    private_key_pem: activeOrder.private_key_pem,
  })

  console.log(`[GGS] Reissue complete for ${cert.domain}`)
  return { ok: true }
}

// ── Renew a free/ACME cert (in-place update) ──────────────────────────
async function renewAcme(cert: Certificate): Promise<{ ok: boolean; error?: string }> {
  const verifyRes = await fetch(ACME_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      action: 'verify', sessionId: cert.session_id, domain: cert.domain,
      auto_renew: true, user_id: cert.user_id, dns_provider_id: cert.dns_provider_id
    })
  })
  const verifyData = await verifyRes.json().catch(() => ({}))
  if (!verifyRes.ok || !verifyData.verified) {
    return { ok: false, error: verifyData.message || `Verification failed (HTTP ${verifyRes.status})` }
  }

  const finalizeRes = await fetch(ACME_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ action: 'finalize', sessionId: cert.session_id, domain: cert.domain, user_id: cert.user_id, auto_renew: true })
  })
  const finalizeData = await finalizeRes.json().catch(() => ({}))
  if (!finalizeRes.ok || !finalizeData.cert_pem) {
    return { ok: false, error: finalizeData.message || `Finalize failed (HTTP ${finalizeRes.status})` }
  }

  const newExpiry = finalizeData.expires_at || new Date(Date.now() + 90 * 86400000).toISOString()
  const { error: updateError } = await supabase.from('certificates').update({
    cert_pem: finalizeData.cert_pem,
    private_key_pem: finalizeData.private_key_pem || undefined,
    issued_at: finalizeData.issued_at || new Date().toISOString(),
    expires_at: newExpiry, status: 'active',
    auto_renew_attempt_count: 0,
    last_renewal_attempt_at: new Date().toISOString(),
    last_renewal_status: 'success', last_renewal_error: null,
  }).eq('id', cert.id)

  if (updateError) return { ok: false, error: `DB update failed: ${updateError.message}` }
  await dispatchToAllAgents(cert, finalizeData)
  return { ok: true }
}

// ── Renew a sandbox TSS cert (rotation: old → sandbox_revoked, new row active) ──
async function renewSandboxTss(cert: Certificate): Promise<{ ok: boolean; error?: string }> {
  const tssRes = await fetch(TSS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      action: 'sandbox_renew', user_id: cert.user_id, domain: cert.domain,
      cert_type: cert.cert_type || 'RapidSSL DV', is_sandbox: true, old_cert_id: cert.id,
      firstName: cert.first_name || 'Admin', lastName: cert.last_name || 'Admin',
      adminEmail: cert.admin_email || '', phone: cert.phone || '', years: cert.years || 1,
    })
  })
  const tssData = await tssRes.json().catch(() => ({}))
  if (!tssRes.ok || tssData.error) {
    return { ok: false, error: tssData.error || `TSS sandbox_renew failed (HTTP ${tssRes.status})` }
  }

  if (tssData.db_handled) {
    if (tssData.new_cert) await dispatchToAllAgents(cert, tssData.new_cert)
    return { ok: true }
  }

  const now = new Date().toISOString()
  const newExpiry = tssData.expires_at || new Date(Date.now() + 86400000).toISOString()

  await supabase.from('certificates').update({ status: 'sandbox_revoked', revoked_at: now }).eq('id', cert.id)

  const { data: newCert, error: insertError } = await supabase.from('certificates').insert({
    user_id: cert.user_id, domain: cert.domain,
    cert_pem: tssData.cert_pem, private_key_pem: tssData.private_key_pem || null,
    issued_at: tssData.issued_at || now, expires_at: newExpiry,
    status: 'active', cert_type: cert.cert_type || 'RapidSSL DV', is_sandbox: true,
    auto_renew_enabled: true, dns_provider_id: cert.dns_provider_id, session_id: cert.session_id,
    auto_renew_attempt_count: 0, last_renewal_attempt_at: now,
    last_renewal_status: 'success', last_renewal_error: null,
    first_name: cert.first_name, last_name: cert.last_name,
    admin_email: cert.admin_email, phone: cert.phone, years: cert.years,
    tss_order_id: tssData.order_id || null,
  }).select().single()

  if (insertError) {
    await supabase.from('certificates').update({ status: 'active', revoked_at: null }).eq('id', cert.id)
    return { ok: false, error: `DB insert new cert failed: ${insertError.message}` }
  }

  if (newCert) await dispatchToAllAgents(cert, tssData)
  return { ok: true }
}

// ── Dispatch install job to all registered agents for this domain ─────
async function dispatchToAllAgents(cert: Certificate, certData: Record<string, unknown>) {
  try {
    const { data: serverRows } = await supabase
      .from('server_credentials')
      .select('id, agent_id, nickname, server_type')
      .contains('domains', [cert.domain])
      .not('agent_id', 'is', null)

    if (!serverRows?.length) {
      console.log(`No agents registered for ${cert.domain} — skipping dispatch`)
      return
    }

    const certPem = certData.cert_pem as string || ''
    const keyPem  = certData.private_key_pem as string || ''

    for (const row of serverRows) {
      if (row.server_type && row.server_type !== 'ssh') continue
      try {
        const { data: existing } = await supabase
          .from('agent_jobs').select('id')
          .eq('agent_id', row.agent_id).eq('cert_id', cert.id)
          .in('status', ['queued', 'claimed']).maybeSingle()

        if (existing) { console.log(`Renew job already queued for agent ${row.agent_id} — skipping`); continue }

        await supabase.from('agent_jobs').insert({
          agent_id: row.agent_id, user_id: cert.user_id, cert_id: cert.id,
          job_type: 'renew', status: 'queued',
          cert_pem: certPem, key_pem: keyPem, domain: cert.domain,
        })
        console.log(`Queued renew job → agent ${row.agent_id} (${row.nickname}) for ${cert.domain}`)
      } catch (rowErr: any) {
        console.error(`Failed to queue job for agent ${row.agent_id}:`, rowErr.message)
      }
    }
  } catch (err: any) {
    console.error('dispatchToAllAgents failed (non-fatal):', err.message)
  }
}

// ── Email notifications ───────────────────────────────────────────────
const EMAIL_FUNCTION_URL = Deno.env.get('EMAIL_FUNCTION_URL') || `${SUPABASE_URL}/functions/v1/send-renewal-email`
const userEmailCache = new Map<string, string | null>()

async function getUserEmail(userId: string): Promise<string | null> {
  if (userEmailCache.has(userId)) return userEmailCache.get(userId)!
  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) { userEmailCache.set(userId, null); return null }
    userEmailCache.set(userId, data.user.email)
    return data.user.email
  } catch (err) { console.error(`getUserEmail failed for ${userId}:`, err); userEmailCache.set(userId, null); return null }
}

async function sendNotification(
  type: 'renewal_succeeded' | 'renewal_failed',
  cert: Certificate,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const to = await getUserEmail(cert.user_id)
    if (!to) { console.warn(`No email for user ${cert.user_id}, skipping`); return }
    const res = await fetch(EMAIL_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, domain: cert.domain, data: { ...data, user_id: cert.user_id, cert_id: cert.id } })
    })
    if (!res.ok) console.warn(`Email send failed (${res.status})`)
  } catch (err) { console.warn('sendNotification crashed (continuing):', err) }
}

// ── Process one cert ──────────────────────────────────────────────────
async function processCert(cert: Certificate): Promise<{ status: 'renewed' | 'failed' | 'skipped'; reason?: string }> {
  const isGgs = !!cert.ggs_order_id

  // GGS certs don't need a dns_provider_id — DNS is handled internally by gogetssl-issue
  if (!isGgs && !cert.dns_provider_id && !cert.is_sandbox) {
    return { status: 'skipped', reason: 'no_dns_provider' }
  }
  if (!shouldAttemptRetry(cert)) return { status: 'skipped', reason: 'backoff' }

  await logEvent(cert.id, cert.user_id, 'renewal_started', { domain: cert.domain, is_ggs: isGgs, is_sandbox: cert.is_sandbox })

  const result = isGgs
    ? await renewGgs(cert)
    : cert.is_sandbox
      ? await renewSandboxTss(cert)
      : await renewAcme(cert)

  if (result.ok) {
    await logEvent(cert.id, cert.user_id, 'renewal_succeeded', {
      domain: cert.domain, is_ggs: isGgs,
      attempts_taken: cert.auto_renew_attempt_count + 1
    })
    const { data: updatedCert } = await supabase.from('certificates').select('expires_at').eq('id', cert.id).single()
    await sendNotification('renewal_succeeded', cert, {
      new_expiry: updatedCert?.expires_at, renewed_at: new Date().toISOString(), is_ggs: isGgs
    })
    return { status: 'renewed' }
  } else {
    const newAttemptCount = cert.auto_renew_attempt_count + 1
    const willRetry = newAttemptCount < MAX_ATTEMPTS
    await supabase.from('certificates').update({
      auto_renew_attempt_count: newAttemptCount,
      last_renewal_attempt_at: new Date().toISOString(),
      last_renewal_status: 'failed',
      last_renewal_error: result.error?.slice(0, 500) || 'Unknown error',
    }).eq('id', cert.id)
    await logEvent(cert.id, cert.user_id, 'renewal_failed', {
      domain: cert.domain, error: result.error, attempt: newAttemptCount, will_retry: willRetry
    })
    const daysLeft = cert.expires_at
      ? Math.max(0, Math.floor((new Date(cert.expires_at).getTime() - Date.now()) / 86400000)) : 0
    const nextRetryHours = BACKOFF_HOURS[Math.min(newAttemptCount, BACKOFF_HOURS.length - 1)] || 24
    await sendNotification('renewal_failed', cert, {
      error: result.error, attempt: newAttemptCount, max_attempts: MAX_ATTEMPTS,
      will_retry: willRetry, days_left: daysLeft, next_retry_hours: nextRetryHours
    })
    return { status: 'failed', reason: result.error }
  }
}

// ── Find certs to process ─────────────────────────────────────────────
async function findCertsToRenew(): Promise<Certificate[]> {
  const ggsCutoff     = new Date(Date.now() + GGS_REISSUE_WINDOW_DAYS * 86400000).toISOString()
  const normalCutoff  = new Date(Date.now() + RENEWAL_WINDOW_DAYS * 86400000).toISOString()
  const sandboxCutoff = new Date(Date.now() + SANDBOX_RENEWAL_HOURS * 3600000).toISOString()

  const SELECT = 'id, user_id, domain, session_id, expires_at, auto_renew_enabled, auto_renew_attempt_count, last_renewal_attempt_at, dns_provider_id, status, is_sandbox, cert_type, ggs_order_id, install_method, tss_order_id, years, first_name, last_name, admin_email, phone'

  // GGS paid certs: auto_renew_enabled=true, expires within 30 days
  const { data: ggsCerts, error: e0 } = await supabase
    .from('certificates')
    .select(SELECT)
    .eq('auto_renew_enabled', true)
    .eq('status', 'active')
    .eq('is_sandbox', false)
    .not('ggs_order_id', 'is', null)
    .lt('expires_at', ggsCutoff)
    .order('expires_at', { ascending: true })
  if (e0) console.error('findCertsToRenew (ggs) failed:', e0)

  // ACME free certs: no ggs_order_id, expires within 14 days
  const { data: normalCerts, error: e1 } = await supabase
    .from('certificates')
    .select(SELECT)
    .eq('auto_renew_enabled', true)
    .eq('status', 'active')
    .eq('is_sandbox', false)
    .is('ggs_order_id', null)
    .lt('expires_at', normalCutoff)
    .order('expires_at', { ascending: true })
  if (e1) console.error('findCertsToRenew (normal) failed:', e1)

  // Sandbox certs
  const { data: sandboxCerts, error: e2 } = await supabase
    .from('certificates')
    .select(SELECT)
    .eq('auto_renew_enabled', true)
    .eq('status', 'active')
    .eq('is_sandbox', true)
    .lt('expires_at', sandboxCutoff)
    .order('expires_at', { ascending: true })
  if (e2) console.error('findCertsToRenew (sandbox) failed:', e2)

  return [...(ggsCerts || []), ...(normalCerts || []), ...(sandboxCerts || [])] as Certificate[]
}

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('Authorization') || ''
    if (!SERVICE_ROLE_KEY || !auth.includes(SERVICE_ROLE_KEY)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    console.log('cron starting...')
    const startedAt = new Date().toISOString()
    const certs = await findCertsToRenew()
    const summary = {
      started_at: startedAt, finished_at: '',
      total_candidates: certs.length,
      ggs_certs: certs.filter(c => c.ggs_order_id).length,
      normal_certs: certs.filter(c => !c.is_sandbox && !c.ggs_order_id).length,
      sandbox_certs: certs.filter(c => c.is_sandbox).length,
      renewed: 0, failed: 0, skipped_no_dns: 0, skipped_backoff: 0,
      errors: [] as Array<{ domain: string; error: string }>
    }

    for (const cert of certs) {
      try {
        const result = await processCert(cert)
        if (result.status === 'renewed') summary.renewed++
        else if (result.status === 'failed') {
          summary.failed++
          summary.errors.push({ domain: cert.domain, error: result.reason || 'unknown' })
        } else if (result.reason === 'no_dns_provider') summary.skipped_no_dns++
        else if (result.reason === 'backoff') summary.skipped_backoff++
      } catch (err) {
        summary.failed++
        summary.errors.push({ domain: cert.domain, error: String(err) })
        console.error(`Unhandled error processing ${cert.domain}:`, err)
      }
    }

    summary.finished_at = new Date().toISOString()
    console.log('cron summary:', JSON.stringify(summary))
    return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const msg = err instanceof Error ? err.message + '\n' + err.stack : String(err)
    console.error('FATAL cron error:', msg)
    return new Response(JSON.stringify({ error: 'internal_error', message: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
