// supabase/functions/send-renewal-email/index.ts
//
// Sends transactional emails to SSLVault users about their certificate
// auto-renewal lifecycle. Three templates supported:
//
//   1. renewal_succeeded — "Cert for X renewed cleanly"
//   2. renewal_failed    — "Renewal for X failed, here's the error"
//   3. no_dns_warning    — "Connect a DNS provider to enable auto-renewal"
//
// Authentication: service-role-only (called from auto-renew-cron and the
// dashboard server-side). Caller passes the Supabase service_role JWT in the
// Authorization header.
//
// Required edge function secrets:
//   - RESEND_API_KEY           Resend account API key
//   - SERVICE_ROLE_KEY         Same as auto-renew-cron uses (for auth check)
//   - PROJECT_URL              https://frthcwkntciaakqsppss.supabase.co
//   - FROM_EMAIL               (optional, default: notifications@easysecurity.in)
//   - APP_URL                  (optional, default: https://easysecurity.in)
//
// POST body (JSON):
//   {
//     "type": "renewal_succeeded" | "renewal_failed" | "no_dns_warning",
//     "to": "user@example.com",
//     "domain": "app.acme.com",
//     "data": { ... template-specific data ... }
//   }
//
// Returns: { ok: true, email_id: "..." } on success, { error: "..." } on fail.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('PROJECT_URL') || 'https://frthcwkntciaakqsppss.supabase.co'
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'SSLVault <notifications@easysecurity.in>'
const APP_URL = Deno.env.get('APP_URL') || 'https://easysecurity.in'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

interface EmailRequest {
  type: 'renewal_succeeded' | 'renewal_failed' | 'no_dns_warning'
  to: string
  domain: string
  data?: Record<string, unknown>
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function emailShell(content: string): string {
  // Minimal, clean, mobile-friendly transactional shell. No tracking pixels,
  // no fancy nested tables — just a centered card with the content.
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSLVault</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:white;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid #f1f5f9;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;vertical-align:middle;">
              <div style="width:32px;height:32px;background:linear-gradient(135deg,#1d4ed8,#4f46e5);border-radius:9px;text-align:center;line-height:32px;color:white;font-weight:700;font-size:14px;">S</div>
            </td>
            <td style="vertical-align:middle;">
              <div style="font-weight:800;font-size:16px;letter-spacing:-0.4px;color:#0f172a;">SSL<span style="color:#2563eb;">Vault</span></div>
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;">CLM Platform</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px;">${content}</td></tr>
        <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;line-height:1.6;">
          SSLVault · Free SSL automation · <a href="${APP_URL}/dashboard" style="color:#94a3b8;text-decoration:underline;">Manage notifications</a>
        </td></tr>
      </table>
      <p style="font-size:11px;color:#94a3b8;margin-top:14px;">You received this because auto-renewal is enabled for your certificate.<br>Reply to this email if you need help.</p>
    </td></tr>
  </table>
</body></html>`
}

function tplRenewalSucceeded(domain: string, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const newExpiry = (data?.new_expiry as string) || ''
  const newExpiryHuman = newExpiry ? new Date(newExpiry).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const renewedAt = (data?.renewed_at as string) || new Date().toISOString()
  const renewedAtHuman = new Date(renewedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC'

  const subject = `✓ ${domain} renewed for 90 more days`

  const html = emailShell(`
    <span style="display:inline-block;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:600;padding:4px 11px;border-radius:100px;border:1px solid #a7f3d0;letter-spacing:0.3px;margin-bottom:14px;">✓ RENEWED SUCCESSFULLY</span>
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px;color:#0f172a;">Certificate renewed for ${domain}</h1>
    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 20px;">Your SSL certificate was automatically renewed. No action needed — your site stays secure for another 90 days.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;border:1px solid #f1f5f9;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#64748b;width:120px;">Domain</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;">${domain}</td>
      </tr>
      <tr>
        <td style="padding:0 16px 12px;font-size:13px;color:#64748b;">Issuer</td>
        <td style="padding:0 16px 12px;font-size:13px;color:#0f172a;">Let's Encrypt</td>
      </tr>
      <tr>
        <td style="padding:0 16px 12px;font-size:13px;color:#64748b;">Renewed at</td>
        <td style="padding:0 16px 12px;font-size:13px;color:#0f172a;">${renewedAtHuman}</td>
      </tr>
      <tr>
        <td style="padding:0 16px 14px;font-size:13px;color:#64748b;">New expiry</td>
        <td style="padding:0 16px 14px;font-size:13px;font-weight:600;color:#16a34a;">${newExpiryHuman} · 90 days</td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
      <tr><td style="padding:12px 14px;font-size:12px;color:#78350f;line-height:1.6;">
        <strong style="font-weight:600;">If you self-host</strong>, run your install agent to deploy the new certificate to your web server. If you use Vercel / Netlify / Cloudflare hosting, the new certificate is auto-deployed.
      </td></tr>
    </table>

    <div style="margin-top:24px;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0f172a;color:white;text-decoration:none;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:600;">View certificate →</a>
    </div>
  `)

  const text = `Certificate renewed for ${domain}

Your SSL certificate was automatically renewed by SSLVault. No action needed.

  Domain:      ${domain}
  Issuer:      Let's Encrypt
  Renewed at:  ${renewedAtHuman}
  New expiry:  ${newExpiryHuman} (90 days)

If you self-host, run your install agent to deploy the new certificate.
If you use Vercel/Netlify/Cloudflare, the new cert is auto-deployed.

View certificate: ${APP_URL}/dashboard

---
SSLVault · Free SSL automation
`

  return { subject, html, text }
}

function tplRenewalFailed(domain: string, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const error = ((data?.error as string) || 'Unknown error').slice(0, 300)
  const attempt = (data?.attempt as number) || 1
  const maxAttempts = (data?.max_attempts as number) || 5
  const willRetry = (data?.will_retry as boolean) ?? true
  const daysLeft = (data?.days_left as number) ?? 0
  const nextRetryHours = (data?.next_retry_hours as number) || 6

  const subject = willRetry
    ? `⚠ Renewal failed for ${domain} (will retry)`
    : `🚨 ACTION REQUIRED: Renewal exhausted for ${domain}`

  const urgencyColor = willRetry ? '#d97706' : '#dc2626'
  const urgencyBg = willRetry ? '#fffbeb' : '#fef2f2'
  const urgencyBorder = willRetry ? '#fde68a' : '#fecaca'
  const urgencyLabel = willRetry ? 'WILL RETRY' : 'ACTION REQUIRED'

  const html = emailShell(`
    <span style="display:inline-block;background:${urgencyBg};color:${urgencyColor};font-size:11px;font-weight:600;padding:4px 11px;border-radius:100px;border:1px solid ${urgencyBorder};letter-spacing:0.3px;margin-bottom:14px;">⚠ ${urgencyLabel}</span>
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px;color:#0f172a;">Renewal failed for ${domain}</h1>
    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 18px;">${willRetry
      ? `We couldn't auto-renew your certificate. We'll retry in ${nextRetryHours} hours. If retries continue to fail, your site will stop loading securely in ${daysLeft} days.`
      : `We've tried ${maxAttempts} times and renewal still fails. <strong style="color:#0f172a;">Manual action is required</strong> — your site will stop loading securely in ${daysLeft} days.`}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;margin-bottom:16px;">
      <tr><td style="padding:12px 14px;">
        <div style="font-size:12px;font-weight:600;color:#7f1d1d;margin-bottom:4px;">Error details</div>
        <code style="font-size:12px;color:#991b1b;font-family:'SF Mono',Menlo,monospace;line-height:1.5;display:block;">${error}</code>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:10px;border:1px solid #f1f5f9;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#64748b;width:120px;">Domain</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#0f172a;">${domain}</td>
      </tr>
      <tr>
        <td style="padding:0 16px 10px;font-size:13px;color:#64748b;">Days left</td>
        <td style="padding:0 16px 10px;font-size:13px;font-weight:600;color:${daysLeft < 7 ? '#dc2626' : '#d97706'};">${daysLeft} days</td>
      </tr>
      <tr>
        <td style="padding:0 16px 14px;font-size:13px;color:#64748b;">Attempt</td>
        <td style="padding:0 16px 14px;font-size:13px;color:#0f172a;">${attempt} of ${maxAttempts}${willRetry ? ` · next retry in ${nextRetryHours}h` : ' · no more retries'}</td>
      </tr>
    </table>

    <div style="margin-top:24px;">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:${willRetry ? '#0f172a' : '#dc2626'};color:white;text-decoration:none;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:600;margin-right:8px;">${willRetry ? 'View dashboard →' : 'Fix now →'}</a>
    </div>

    <div style="margin-top:18px;font-size:12px;color:#64748b;line-height:1.6;">
      <strong style="color:#0f172a;font-weight:600;">Common causes:</strong>
      <ul style="margin:6px 0 0;padding-left:18px;">
        <li>DNS provider API credentials expired or revoked</li>
        <li>DNS record was deleted manually</li>
        <li>Domain transferred to a different DNS provider</li>
        <li>Let's Encrypt rate limit hit (try in a few hours)</li>
      </ul>
    </div>
  `)

  const text = `Renewal failed for ${domain}

Error: ${error}

  Domain:    ${domain}
  Days left: ${daysLeft}
  Attempt:   ${attempt} of ${maxAttempts}${willRetry ? `\n  Next retry in ${nextRetryHours} hours` : '\n  No more retries — manual action required'}

${willRetry ? `We'll keep trying. If retries continue to fail, your site will stop loading securely in ${daysLeft} days.` : `Manual action is required. Your site will stop loading securely in ${daysLeft} days.`}

Common causes:
  - DNS provider API credentials expired or revoked
  - DNS record was deleted manually
  - Domain transferred to a different DNS provider
  - Let's Encrypt rate limit hit

Fix it: ${APP_URL}/dashboard

---
SSLVault · Free SSL automation
`

  return { subject, html, text }
}

function tplNoDnsWarning(domain: string, data: Record<string, unknown>): { subject: string; html: string; text: string } {
  const daysLeft = (data?.days_left as number) ?? 0

  const subject = `Connect DNS to auto-renew ${domain}`

  const html = emailShell(`
    <span style="display:inline-block;background:#fffbeb;color:#854d0e;font-size:11px;font-weight:600;padding:4px 11px;border-radius:100px;border:1px solid #fde68a;letter-spacing:0.3px;margin-bottom:14px;">⚙ ONE-TIME SETUP</span>
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.5px;margin:0 0 8px;color:#0f172a;">${domain} can't auto-renew yet</h1>
    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 18px;">Your certificate was issued via manual DNS verification. To enable zero-touch auto-renewal, connect a DNS provider — it takes 2 minutes and only needs to be done once.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
      <tr><td style="padding:14px 16px;font-size:13px;color:#854d0e;line-height:1.6;">
        <strong style="font-weight:600;">Without DNS connection</strong>, we can't automatically prove domain ownership at renewal time. Your cert will expire in ${daysLeft} days unless you renew manually.
      </td></tr>
    </table>

    <h2 style="font-size:14px;font-weight:700;color:#0f172a;margin:22px 0 10px;">Supported DNS providers</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="25%" style="padding:8px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:600;color:#0f172a;">Vercel</td>
        <td width="2%"></td>
        <td width="25%" style="padding:8px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:600;color:#0f172a;">Cloudflare</td>
        <td width="2%"></td>
        <td width="25%" style="padding:8px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:600;color:#0f172a;">GoDaddy</td>
        <td width="2%"></td>
        <td width="19%" style="padding:8px;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:600;color:#0f172a;">D.Ocean</td>
      </tr>
    </table>

    <div style="margin-top:24px;">
      <a href="${APP_URL}/dns-providers" style="display:inline-block;background:#0f172a;color:white;text-decoration:none;padding:11px 18px;border-radius:9px;font-size:13px;font-weight:600;">Connect DNS provider →</a>
    </div>
  `)

  const text = `${domain} can't auto-renew yet

Your certificate was issued via manual DNS verification. To enable zero-touch auto-renewal, connect a DNS provider — takes 2 minutes, one-time setup.

Without DNS connection, your cert will expire in ${daysLeft} days unless you renew manually.

Supported providers: Vercel · Cloudflare · GoDaddy · DigitalOcean

Connect: ${APP_URL}/dns-providers

---
SSLVault · Free SSL automation
`

  return { subject, html, text }
}

// ============================================================================
// SEND
// ============================================================================

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        text
      })
    })

    const body = await res.json()
    if (!res.ok) {
      return { ok: false, error: `Resend ${res.status}: ${body?.message || body?.error || JSON.stringify(body)}` }
    }
    return { ok: true, id: body.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ============================================================================
// HANDLER
// ============================================================================

Deno.serve(async (req) => {
  try {
    // Auth
    const auth = req.headers.get('Authorization') || ''
    if (!SERVICE_ROLE_KEY || !auth.includes(SERVICE_ROLE_KEY)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405, headers: { 'Content-Type': 'application/json' }
      })
    }

    const body: EmailRequest = await req.json()

    if (!body.type || !body.to || !body.domain) {
      return new Response(JSON.stringify({ error: 'missing required fields: type, to, domain' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    let template: { subject: string; html: string; text: string }
    if (body.type === 'renewal_succeeded') {
      template = tplRenewalSucceeded(body.domain, body.data || {})
    } else if (body.type === 'renewal_failed') {
      template = tplRenewalFailed(body.domain, body.data || {})
    } else if (body.type === 'no_dns_warning') {
      template = tplNoDnsWarning(body.domain, body.data || {})
    } else {
      return new Response(JSON.stringify({ error: `unknown type: ${body.type}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Sending ${body.type} to ${body.to} for ${body.domain}`)
    const result = await sendViaResend(body.to, template.subject, template.html, template.text)

    if (!result.ok) {
      console.error(`Resend send failed: ${result.error}`)
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    // Log to renewal_events for audit trail
    try {
      const userId = (body.data?.user_id as string) || null
      const certId = (body.data?.cert_id as string) || null
      if (userId) {
        await supabase.from('renewal_events').insert({
          user_id: userId,
          cert_id: certId,
          event_type: 'email_sent',
          details: { type: body.type, to: body.to, domain: body.domain, email_id: result.id }
        })
      }
    } catch (logErr) {
      console.warn('failed to log email_sent event:', logErr)
    }

    return new Response(JSON.stringify({ ok: true, email_id: result.id }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message + '\n' + err.stack : String(err)
    console.error('FATAL send-renewal-email error:', errMsg)
    return new Response(JSON.stringify({ error: 'internal_error', message: errMsg }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
