// auto-renew-cron v2 — GoGetSSL-native reissue + renewal cron
//
// TWO JOBS IN ONE CRON:
//
//   1. POLL PENDING (every run):
//      Checks all dv_pending ssl_orders → activates certs when GGS confirms DNS validation.
//
//   2. REISSUE (every run):
//      Certs where expires_at <= NOW() + 1 day AND status='active' AND ggs_order_id IS NOT NULL
//      → calls gogetssl-issue action='reissue' for each.
//      Blocked if: ssl_orders row for that ggs_order_id already has status='dv_pending'
//
//   3. RENEWAL (every run):
//      Certs where subscription_end_date <= NOW() + 30 days AND status='active' AND ggs_order_id IS NOT NULL
//      AND no active reissue pending AND cert not expiring within 1 day (would reissue instead)
//      → calls gogetssl-issue action='renew' for each.
//
// Schedule: every 5 minutes via pg_cron or Supabase scheduled trigger
// Auth: must include service role key in Authorization header

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function adminDb() { return createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } }) }

async function callGgs(action: string, body: Record<string, unknown>) {
  const res = await fetch(`${SB_URL}/functions/v1/gogetssl-issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SB_SERVICE}` },
    body: JSON.stringify({ action, ...body }),
  })
  return res.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Verify caller is authenticated with service role
    const auth = req.headers.get('Authorization') || ''
    if (!SB_SERVICE || !auth.includes(SB_SERVICE)) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const now = new Date()
    const summary = {
      started_at:    now.toISOString(),
      finished_at:   '',
      poll_checked:  0,
      poll_activated: 0,
      reissue_checked: 0,
      reissue_triggered: 0,
      reissue_skipped: 0,
      renewal_checked: 0,
      renewal_triggered: 0,
      renewal_skipped: 0,
      errors: [] as string[],
    }

    // ── JOB 1: Poll all pending orders ────────────────────────────────
    try {
      const pollRes = await callGgs('poll_pending', {})
      summary.poll_checked   = pollRes.checked  || 0
      summary.poll_activated = pollRes.activated || 0
      console.log(`[cron] poll_pending: checked=${summary.poll_checked} activated=${summary.poll_activated}`)
    } catch (e: any) {
      summary.errors.push(`poll_pending: ${e.message}`)
      console.error('[cron] poll_pending failed:', e.message)
    }

    // ── JOB 2: Reissue — certs expiring within 1 day ─────────────────
    const reissueCutoff = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) // now + 1 day
    const { data: certsToReissue } = await adminDb()
      .from('certificates')
      .select('id, user_id, domain, ggs_order_id, expires_at')
      .eq('status', 'active')
      .not('ggs_order_id', 'is', null)
      .lte('expires_at', reissueCutoff.toISOString())
      .order('expires_at', { ascending: true })

    summary.reissue_checked = certsToReissue?.length || 0
    console.log(`[cron] reissue candidates: ${summary.reissue_checked}`)

    for (const cert of (certsToReissue || [])) {
      try {
        // Block if ssl_orders already has a dv_pending row for this ggs_order_id
        const { data: pendingOrder } = await adminDb()
          .from('ssl_orders')
          .select('id')
          .eq('ggs_order_id', cert.ggs_order_id)
          .eq('status', 'dv_pending')
          .limit(1)
          .single()

        if (pendingOrder) {
          console.log(`[cron] reissue skip ${cert.domain}: order already dv_pending`)
          summary.reissue_skipped++
          continue
        }

        const res = await callGgs('reissue', { cert_id: cert.id, triggered_by: 'auto_cron' })
        if (res.ok) {
          summary.reissue_triggered++
          console.log(`[cron] reissued ${cert.domain} (GGS #${cert.ggs_order_id})`)
        } else {
          summary.errors.push(`reissue ${cert.domain}: ${res.error}`)
          console.error(`[cron] reissue failed ${cert.domain}:`, res.error)
        }
      } catch (e: any) {
        summary.errors.push(`reissue ${cert.domain}: ${e.message}`)
      }
    }

    // ── JOB 3: Renewal — subscription ending within 30 days ──────────
    const renewalCutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // now + 30 days
    const { data: certsToRenew } = await adminDb()
      .from('certificates')
      .select('id, user_id, domain, ggs_order_id, expires_at, subscription_end_date')
      .eq('status', 'active')
      .not('ggs_order_id', 'is', null)
      .not('subscription_end_date', 'is', null)
      .lte('subscription_end_date', renewalCutoff.toISOString())
      .gt('expires_at', reissueCutoff.toISOString()) // skip if cert already being reissued
      .order('subscription_end_date', { ascending: true })

    summary.renewal_checked = certsToRenew?.length || 0
    console.log(`[cron] renewal candidates: ${summary.renewal_checked}`)

    for (const cert of (certsToRenew || [])) {
      try {
        // Block if a renewal order is already dv_pending for this domain
        const { data: pendingRenewal } = await adminDb()
          .from('ssl_orders')
          .select('id')
          .eq('user_id', cert.user_id)
          .eq('domain', cert.domain)
          .eq('status', 'dv_pending')
          .eq('order_purpose', 'renewal')
          .limit(1)
          .single()

        if (pendingRenewal) {
          console.log(`[cron] renewal skip ${cert.domain}: renewal already dv_pending`)
          summary.renewal_skipped++
          continue
        }

        const res = await callGgs('renew', { cert_id: cert.id, triggered_by: 'auto_cron' })
        if (res.ok) {
          summary.renewal_triggered++
          console.log(`[cron] renewal triggered ${cert.domain}`)
        } else {
          summary.errors.push(`renewal ${cert.domain}: ${res.error}`)
          console.error(`[cron] renewal failed ${cert.domain}:`, res.error)
        }
      } catch (e: any) {
        summary.errors.push(`renewal ${cert.domain}: ${e.message}`)
      }
    }

    summary.finished_at = new Date().toISOString()
    console.log('[cron] done:', JSON.stringify(summary))
    return json(summary)

  } catch (e: any) {
    console.error('[cron] FATAL:', e)
    return json({ error: e.message }, 500)
  }
})
