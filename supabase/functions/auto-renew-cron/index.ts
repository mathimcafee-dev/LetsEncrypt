// SSLVault Auto-Renewal Cron
// Runs daily at 03:00 UTC via Supabase scheduled trigger.
// Walks every certificate with auto_renew_enabled=true and expires_at < now+14d.
// For each, attempts a renewal. Logs every event to renewal_events.
//
// Deploy via Supabase Dashboard → Edge Functions → Create Function "auto-renew-cron"
// Schedule via Supabase Dashboard → Database → Cron → New Job:
//   schedule: "0 3 * * *"  (every day 03:00 UTC)
//   command:  select net.http_post(url := 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/auto-renew-cron', headers := jsonb_build_object('Authorization','Bearer ' || current_setting('app.cron_secret')))::text;
//
// Required env vars (Supabase → Functions → auto-renew-cron → Secrets):
//   SUPABASE_URL              (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//   ACME_FUNCTION_URL         = https://frthcwkntciaakqsppss.supabase.co/functions/v1/acme-ssl

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Note: Supabase reserves the SUPABASE_* env var prefix and blocks reading
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from inside functions. We must use
// custom-named env vars (set via Edge Function Secrets in the dashboard).
const SUPABASE_URL = Deno.env.get('PROJECT_URL') || Deno.env.get('SUPABASE_URL') || 'https://frthcwkntciaakqsppss.supabase.co'
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const ACME_URL = Deno.env.get('ACME_FUNCTION_URL') || `${SUPABASE_URL}/functions/v1/acme-ssl`

if (!SERVICE_ROLE_KEY) {
  console.error('FATAL: SERVICE_ROLE_KEY env var is missing. Set it in Edge Function Secrets.')
}

const RENEWAL_WINDOW_DAYS = 14   // Renew anything expiring within 14 days
const MAX_ATTEMPTS = 5           // After 5 consecutive failures, stop trying (alert user instead)
const BACKOFF_HOURS = [0, 6, 24, 72, 168]  // 0h, 6h, 24h, 3d, 7d between retries

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
}

async function logEvent(certId: string | null, userId: string, eventType: string, details: Record<string, unknown> = {}) {
  try {
    await supabase.from('renewal_events').insert({
      cert_id: certId,
      user_id: userId,
      event_type: eventType,
      details
    })
  } catch (err) {
    console.error('logEvent failed', err)
  }
}

function shouldAttemptRetry(cert: Certificate): boolean {
  if (cert.auto_renew_attempt_count >= MAX_ATTEMPTS) return false
  if (!cert.last_renewal_attempt_at) return true

  const lastAttempt = new Date(cert.last_renewal_attempt_at).getTime()
  const backoffHours = BACKOFF_HOURS[Math.min(cert.auto_renew_attempt_count, BACKOFF_HOURS.length - 1)]
  const earliestNextAttempt = lastAttempt + backoffHours * 3600 * 1000
  return Date.now() >= earliestNextAttempt
}

async function renewSingle(cert: Certificate): Promise<{ ok: boolean; error?: string }> {
  // Step 1: verify DNS (this also auto-creates the TXT record if dns_provider_id is set,
  //         since the existing acme-ssl edge function already handles that path).
  const verifyRes = await fetch(ACME_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      action: 'verify',
      sessionId: cert.session_id,
      domain: cert.domain,
      auto_renew: true,
      user_id: cert.user_id,
      dns_provider_id: cert.dns_provider_id
    })
  })

  const verifyData = await verifyRes.json().catch(() => ({}))
  if (!verifyRes.ok || !verifyData.verified) {
    return { ok: false, error: verifyData.message || `Verification failed (HTTP ${verifyRes.status})` }
  }

  // Step 2: finalize → fetch new cert
  const finalizeRes = await fetch(ACME_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      action: 'finalize',
      sessionId: cert.session_id,
      domain: cert.domain,
      user_id: cert.user_id,
      auto_renew: true
    })
  })

  const finalizeData = await finalizeRes.json().catch(() => ({}))
  if (!finalizeRes.ok || !finalizeData.cert_pem) {
    return { ok: false, error: finalizeData.message || `Finalize failed (HTTP ${finalizeRes.status})` }
  }

  // Step 3: update certificates row with new cert
  const newExpiry = finalizeData.expires_at || new Date(Date.now() + 90 * 86400000).toISOString()
  const { error: updateError } = await supabase
    .from('certificates')
    .update({
      cert_pem: finalizeData.cert_pem,
      private_key_pem: finalizeData.private_key_pem || undefined,
      issued_at: finalizeData.issued_at || new Date().toISOString(),
      expires_at: newExpiry,
      status: 'active',
      auto_renew_attempt_count: 0,
      last_renewal_attempt_at: new Date().toISOString(),
      last_renewal_status: 'success',
      last_renewal_error: null,
    })
    .eq('id', cert.id)

  if (updateError) return { ok: false, error: `DB update failed: ${updateError.message}` }

  // Step 4: dispatch install job to persistent agent if one is registered for this domain
  try {
    const { data: serverRows } = await supabase
      .from('server_credentials')
      .select('agent_id')
      .contains('domains', [cert.domain])
      .not('agent_id', 'is', null)
      .limit(1)

    if (serverRows && serverRows.length > 0 && serverRows[0].agent_id) {
      const agentId = serverRows[0].agent_id
      // Verify agent is active (seen in last 30 min)
      const { data: agent } = await supabase
        .from('persistent_agents')
        .select('id, last_seen_at')
        .eq('id', agentId)
        .eq('status', 'active')
        .single()

      if (agent && agent.last_seen_at) {
        const minsAgo = Math.floor((Date.now() - new Date(agent.last_seen_at).getTime()) / 60000)
        if (minsAgo < 30) {
          await supabase.from('agent_jobs').insert({
            agent_id: agentId,
            user_id: cert.user_id,
            cert_id: cert.id,
            job_type: 'renew',
            status: 'queued',
            cert_pem: finalizeData.cert_pem,
            key_pem: finalizeData.private_key_pem || '',
            domain: cert.domain,
          })
          console.log(`Dispatched renewal job to agent ${agentId} for ${cert.domain}`)
        }
      }
    }
  } catch (agentErr: any) {
    // Non-fatal — cert is already renewed, agent dispatch is best-effort
    console.error('Agent dispatch failed (non-fatal):', agentErr.message)
  }

  return { ok: true }
}

// ============================================================================
// EMAIL NOTIFICATIONS (Build 1.5)
// ============================================================================

const EMAIL_FUNCTION_URL = Deno.env.get('EMAIL_FUNCTION_URL')
  || `${SUPABASE_URL}/functions/v1/send-renewal-email`

// Cache: avoid re-fetching the same user's email in one cron run
const userEmailCache = new Map<string, string | null>()

async function getUserEmail(userId: string): Promise<string | null> {
  if (userEmailCache.has(userId)) return userEmailCache.get(userId)!
  try {
    // Supabase admin API can read auth.users via the service role
    const { data, error } = await supabase.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) {
      userEmailCache.set(userId, null)
      return null
    }
    userEmailCache.set(userId, data.user.email)
    return data.user.email
  } catch (err) {
    console.error(`getUserEmail failed for ${userId}:`, err)
    userEmailCache.set(userId, null)
    return null
  }
}

async function sendNotification(
  type: 'renewal_succeeded' | 'renewal_failed',
  cert: Certificate,
  data: Record<string, unknown> = {}
): Promise<void> {
  // Best-effort. We never want a failed email to crash the cron.
  try {
    const to = await getUserEmail(cert.user_id)
    if (!to) {
      console.warn(`No email found for user ${cert.user_id}, skipping notification`)
      return
    }

    const res = await fetch(EMAIL_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        to,
        domain: cert.domain,
        data: { ...data, user_id: cert.user_id, cert_id: cert.id }
      })
    })

    if (!res.ok) {
      const txt = await res.text()
      console.warn(`Email send failed (${res.status}): ${txt.slice(0, 200)}`)
    }
  } catch (err) {
    console.warn(`sendNotification crashed (continuing):`, err)
  }
}


async function processCert(cert: Certificate): Promise<{ status: 'renewed' | 'failed' | 'skipped'; reason?: string }> {
  // Skip rules
  if (!cert.dns_provider_id) {
    return { status: 'skipped', reason: 'no_dns_provider' }
  }
  if (!shouldAttemptRetry(cert)) {
    return { status: 'skipped', reason: 'backoff' }
  }

  await logEvent(cert.id, cert.user_id, 'renewal_started', { domain: cert.domain })

  const result = await renewSingle(cert)

  if (result.ok) {
    await logEvent(cert.id, cert.user_id, 'renewal_succeeded', {
      domain: cert.domain,
      attempts_taken: cert.auto_renew_attempt_count + 1
    })

    // Fetch the new expiry from the just-updated cert row (renewSingle wrote it)
    const { data: updatedCert } = await supabase
      .from('certificates')
      .select('expires_at')
      .eq('id', cert.id)
      .single()

    await sendNotification('renewal_succeeded', cert, {
      new_expiry: updatedCert?.expires_at,
      renewed_at: new Date().toISOString()
    })

    return { status: 'renewed' }
  } else {
    const newAttemptCount = cert.auto_renew_attempt_count + 1
    const willRetry = newAttemptCount < MAX_ATTEMPTS

    // Bump attempt count + record error
    await supabase.from('certificates').update({
      auto_renew_attempt_count: newAttemptCount,
      last_renewal_attempt_at: new Date().toISOString(),
      last_renewal_status: 'failed',
      last_renewal_error: result.error?.slice(0, 500) || 'Unknown error',
    }).eq('id', cert.id)

    await logEvent(cert.id, cert.user_id, 'renewal_failed', {
      domain: cert.domain,
      error: result.error,
      attempt: newAttemptCount,
      will_retry: willRetry
    })

    // Compute days left until expiry for the email
    const daysLeft = cert.expires_at
      ? Math.max(0, Math.floor((new Date(cert.expires_at).getTime() - Date.now()) / 86400000))
      : 0
    const nextRetryHours = BACKOFF_HOURS[Math.min(newAttemptCount, BACKOFF_HOURS.length - 1)] || 24

    await sendNotification('renewal_failed', cert, {
      error: result.error,
      attempt: newAttemptCount,
      max_attempts: MAX_ATTEMPTS,
      will_retry: willRetry,
      days_left: daysLeft,
      next_retry_hours: nextRetryHours
    })

    return { status: 'failed', reason: result.error }
  }
}

async function findCertsToRenew(): Promise<Certificate[]> {
  const cutoff = new Date(Date.now() + RENEWAL_WINDOW_DAYS * 86400000).toISOString()

  const { data, error } = await supabase
    .from('certificates')
    .select('id, user_id, domain, session_id, expires_at, auto_renew_enabled, auto_renew_attempt_count, last_renewal_attempt_at, dns_provider_id, status')
    .eq('auto_renew_enabled', true)
    .eq('status', 'active')
    .lt('expires_at', cutoff)
    .order('expires_at', { ascending: true })

  if (error) {
    console.error('findCertsToRenew query failed:', error)
    return []
  }
  return (data || []) as Certificate[]
}

Deno.serve(async (req) => {
  try {
    // Authenticate the cron caller with the service role key
    const auth = req.headers.get('Authorization') || ''
    if (!SERVICE_ROLE_KEY || !auth.includes(SERVICE_ROLE_KEY)) {
      console.log('auth check failed: missing or wrong bearer token')
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log('cron starting...')
    const startedAt = new Date().toISOString()
    const certs = await findCertsToRenew()
    const summary = {
      started_at: startedAt,
      finished_at: '',
      total_candidates: certs.length,
      renewed: 0,
      failed: 0,
      skipped_no_dns: 0,
      skipped_backoff: 0,
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

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    // Top-level catch: ensure we always log something instead of silently dying
    const errMsg = err instanceof Error ? err.message + '\n' + err.stack : String(err)
    console.error('FATAL cron error:', errMsg)
    return new Response(JSON.stringify({ error: 'internal_error', message: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
