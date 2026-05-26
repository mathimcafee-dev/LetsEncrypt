// SSLVault Auto-Renewal Cron
// Runs every 30 minutes via Supabase scheduled trigger (sandbox period).
// For sandbox certs (is_sandbox=true): renews anything expiring within 20 hours,
//   marks old row 'sandbox_revoked', inserts new row as 'active'.
// For normal certs: renews anything expiring within 14 days, updates in place.
// Logs every event to renewal_events.
//
// Deploy via Supabase Dashboard → Edge Functions → Create Function "auto-renew-cron"
// Schedule via Supabase Dashboard → Database → Cron → New Job:
//   SANDBOX schedule:  "*/30 * * * *"  (every 30 minutes)
//   LIVE schedule:     "0 3 * * *"     (every day 03:00 UTC)
//   command:  select net.http_post(url := 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/auto-renew-cron', headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.cron_secret')))::text;
//
// Required env vars (Supabase → Functions → auto-renew-cron → Secrets):
//   SUPABASE_URL              (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//   ACME_FUNCTION_URL         = https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl
//   TSS_FUNCTION_URL          = https://frthcwkntciaakqsppss.supabase.co/functions/v1/tss-issue

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL') || 'https://frthcwkntciaakqsppss.supabase.co'
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ACME_URL = Deno.env.get('ACME_FUNCTION_URL') || `${SUPABASE_URL}/functions/v1/acme-ssl`
const TSS_URL  = Deno.env.get('TSS_FUNCTION_URL')  || `${SUPABASE_URL}/functions/v1/tss-issue`

if (!SERVICE_ROLE_KEY) {
  console.error('FATAL: SERVICE_ROLE_KEY env var is missing. Set it in Edge Function Secrets.')
}

const RENEWAL_WINDOW_DAYS    = 14    // Normal certs: renew if expiring within 14 days
const SANDBOX_RENEWAL_HOURS  = 40    // Sandbox certs: renew if expiring within 40 hours (TSS sandbox validity = 48h)
const MAX_ATTEMPTS = 5
const BACKOFF_HOURS = [0, 6, 24, 72, 168]

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
  // TSS-specific fields stored on the cert row
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
  const earliestNextAttempt = lastAttempt + backoffHours * 3600 * 1000
  return Date.now() >= earliestNextAttempt
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
    body: JSON.stringify({
      action: 'finalize', sessionId: cert.session_id, domain: cert.domain,
      user_id: cert.user_id, auto_renew: true
    })
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
  // Call tss-issue with action='sandbox_renew' — the edge fn re-orders and returns new cert data
  const tssRes = await fetch(TSS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    body: JSON.stringify({
      action: 'sandbox_renew',
      user_id: cert.user_id,
      domain: cert.domain,
      cert_type: cert.cert_type || 'RapidSSL DV',
      is_sandbox: true,
      old_cert_id: cert.id,
      // Re-use stored contact info from original order
      firstName: cert.first_name || 'Admin',
      lastName:  cert.last_name  || 'Admin',
      adminEmail: cert.admin_email || '',
      phone: cert.phone || '',
      years: cert.years || 1,
    })
  })

  const tssData = await tssRes.json().catch(() => ({}))
  if (!tssRes.ok || tssData.error) {
    return { ok: false, error: tssData.error || `TSS sandbox_renew failed (HTTP ${tssRes.status})` }
  }

  // tssData should contain: cert_pem, private_key_pem, expires_at, new_cert_id (inserted by edge fn)
  // If the edge function already inserted the new cert row and updated the old one, we're done.
  // But we also handle the case where we need to do the DB work here.
  if (tssData.db_handled) {
    // Edge function handled DB writes — just dispatch agent job
    if (tssData.new_cert) await dispatchToAllAgents(cert, tssData.new_cert)
    return { ok: true }
  }

  // Edge function returned cert data — we handle DB writes
  const now = new Date().toISOString()
  const newExpiry = tssData.expires_at || new Date(Date.now() + 1 * 86400000).toISOString()

  // Step 1: Mark old cert as sandbox_revoked
  await supabase.from('certificates').update({
    status: 'sandbox_revoked',
    revoked_at: now,
  }).eq('id', cert.id)

  // Step 2: Insert new active cert row
  const { data: newCert, error: insertError } = await supabase.from('certificates').insert({
    user_id: cert.user_id,
    domain: cert.domain,
    cert_pem: tssData.cert_pem,
    private_key_pem: tssData.private_key_pem || null,
    issued_at: tssData.issued_at || now,
    expires_at: newExpiry,
    status: 'active',
    cert_type: cert.cert_type || 'RapidSSL DV',
    is_sandbox: true,
    auto_renew_enabled: true,
    dns_provider_id: cert.dns_provider_id,
    session_id: cert.session_id,
    auto_renew_attempt_count: 0,
    last_renewal_attempt_at: now,
    last_renewal_status: 'success',
    last_renewal_error: null,
    // Preserve contact info for future renewals
    first_name: cert.first_name,
    last_name: cert.last_name,
    admin_email: cert.admin_email,
    phone: cert.phone,
    years: cert.years,
    tss_order_id: tssData.order_id || null,
  }).select().single()

  if (insertError) {
    // Undo the revoke if insert failed
    await supabase.from('certificates').update({ status: 'active', revoked_at: null }).eq('id', cert.id)
    return { ok: false, error: `DB insert new cert failed: ${insertError.message}` }
  }

  if (newCert) await dispatchToAllAgents(cert, tssData)
  return { ok: true }
}

// ── Dispatch install job to persistent agent if domain is registered ──
// Dispatch a renew job to EVERY SSH server registered for this domain.
// Key design decisions:
//   1. No online check — job stays queued until agent polls. Agent may be
//      temporarily offline; it will pick up the job on its next 5-min poll.
//   2. Dispatch to ALL matched servers — a domain may be on multiple VPS.
//   3. Dedup — skip if a queued/claimed renew job already exists for this
//      agent+cert combination (avoids duplicate jobs on rapid cron runs).
async function dispatchToAllAgents(cert: Certificate, certData: Record<string, unknown>) {
  try {
    // Find ALL server_credentials rows for this domain that have an agent linked
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
      // Only dispatch to SSH servers (VPS persistent agent)
      if (row.server_type && row.server_type !== 'ssh') continue

      try {
        // Dedup: check if a pending renew job already exists for this agent+cert
        const { data: existing } = await supabase
          .from('agent_jobs')
          .select('id')
          .eq('agent_id', row.agent_id)
          .eq('cert_id', cert.id)
          .in('status', ['queued', 'claimed'])
          .maybeSingle()

        if (existing) {
          console.log(`Renew job already queued for agent ${row.agent_id} cert ${cert.id} — skipping`)
          continue
        }

        await supabase.from('agent_jobs').insert({
          agent_id: row.agent_id,
          user_id: cert.user_id,
          cert_id: cert.id,
          job_type: 'renew',
          status: 'queued',
          cert_pem: certPem,
          key_pem: keyPem,
          domain: cert.domain,
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
    if (!to) { console.warn(`No email found for user ${cert.user_id}, skipping notification`); return }
    const res = await fetch(EMAIL_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, domain: cert.domain, data: { ...data, user_id: cert.user_id, cert_id: cert.id } })
    })
    if (!res.ok) console.warn(`Email send failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  } catch (err) { console.warn('sendNotification crashed (continuing):', err) }
}

// ── Process one cert ──────────────────────────────────────────────────
async function processCert(cert: Certificate): Promise<{ status: 'renewed' | 'failed' | 'skipped'; reason?: string }> {
  if (!cert.dns_provider_id && !cert.is_sandbox) return { status: 'skipped', reason: 'no_dns_provider' }
  if (!shouldAttemptRetry(cert)) return { status: 'skipped', reason: 'backoff' }

  await logEvent(cert.id, cert.user_id, 'renewal_started', { domain: cert.domain, is_sandbox: cert.is_sandbox })

  const result = cert.is_sandbox
    ? await renewSandboxTss(cert)
    : await renewAcme(cert)

  if (result.ok) {
    await logEvent(cert.id, cert.user_id, 'renewal_succeeded', {
      domain: cert.domain, is_sandbox: cert.is_sandbox,
      attempts_taken: cert.auto_renew_attempt_count + 1
    })
    const { data: updatedCert } = await supabase.from('certificates')
      .select('expires_at').eq('id', cert.id).single()
    await sendNotification('renewal_succeeded', cert, {
      new_expiry: updatedCert?.expires_at, renewed_at: new Date().toISOString(),
      is_sandbox: cert.is_sandbox
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

// ── Find certs to renew ───────────────────────────────────────────────
async function findCertsToRenew(): Promise<Certificate[]> {
  const normalCutoff  = new Date(Date.now() + RENEWAL_WINDOW_DAYS * 86400000).toISOString()
  const sandboxCutoff = new Date(Date.now() + SANDBOX_RENEWAL_HOURS * 3600000).toISOString()

  // Normal certs: expires_at < 14 days from now
  const { data: normalCerts, error: e1 } = await supabase
    .from('certificates')
    .select('id, user_id, domain, session_id, expires_at, auto_renew_enabled, auto_renew_attempt_count, last_renewal_attempt_at, dns_provider_id, status, is_sandbox, cert_type, tss_order_id, years, first_name, last_name, admin_email, phone')
    .eq('auto_renew_enabled', true)
    .eq('status', 'active')
    .eq('is_sandbox', false)
    .lt('expires_at', normalCutoff)
    .order('expires_at', { ascending: true })

  if (e1) console.error('findCertsToRenew (normal) failed:', e1)

  // Sandbox certs: expires_at < 20 hours from now
  const { data: sandboxCerts, error: e2 } = await supabase
    .from('certificates')
    .select('id, user_id, domain, session_id, expires_at, auto_renew_enabled, auto_renew_attempt_count, last_renewal_attempt_at, dns_provider_id, status, is_sandbox, cert_type, tss_order_id, years, first_name, last_name, admin_email, phone')
    .eq('auto_renew_enabled', true)
    .eq('status', 'active')
    .eq('is_sandbox', true)
    .lt('expires_at', sandboxCutoff)
    .order('expires_at', { ascending: true })

  if (e2) console.error('findCertsToRenew (sandbox) failed:', e2)

  return [...(normalCerts || []), ...(sandboxCerts || [])] as Certificate[]
}

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('Authorization') || ''
    if (!SERVICE_ROLE_KEY || !auth.includes(SERVICE_ROLE_KEY)) {
      console.log('auth check failed: missing or wrong bearer token')
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    console.log('cron starting...')
    const startedAt = new Date().toISOString()
    const certs = await findCertsToRenew()
    const summary = {
      started_at: startedAt, finished_at: '',
      total_candidates: certs.length,
      normal_certs: certs.filter(c => !c.is_sandbox).length,
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

    // Also poll any pending GGS orders (dv_pending ssl_orders → activate + dispatch)
    try {
      const sbUrl = 'https://frthcwkntciaakqsppss.supabase.co'
      const srk = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      const pollRes = await fetch(`${sbUrl}/functions/v1/gogetssl-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${srk}` },
        body: JSON.stringify({ action: 'poll_pending' })
      })
      const pollData = await pollRes.json().catch(() => ({}))
      ;(summary as any).ggs_poll = { checked: pollData.checked || 0, activated: pollData.activated || 0 }
    } catch (pollErr) {
      console.warn('GGS poll_pending failed (non-fatal):', pollErr)
    }

    summary.finished_at = new Date().toISOString()
    console.log('cron summary:', JSON.stringify(summary))
    return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message + '\n' + err.stack : String(err)
    console.error('FATAL cron error:', errMsg)
    return new Response(JSON.stringify({ error: 'internal_error', message: errMsg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
