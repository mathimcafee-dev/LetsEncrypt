// vaultbrain-v2 — SSLVault AI Agent with real tool-use
// Uses Claude's native tool-use API so the AI can read AND act on certs.
// Tools that mutate state (issue, renew, reissue, install) require
// the client to send { confirmed: true } before the action executes.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SB_URL        = Deno.env.get('SUPABASE_URL') || ''
const SB_ANON       = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SB_SERVICE    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const FN_BASE       = `${SB_URL}/functions/v1`

function adminDb() { return createClient(SB_URL, SB_SERVICE) }

function daysLabel(iso: string | null) {
  if (!iso) return 'unknown'
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (d < 0)  return `EXPIRED ${Math.abs(d)}d ago`
  if (d === 0) return 'expires today'
  return `${d}d left`
}

async function callFn(fn: string, body: Record<string, unknown>, authHeader: string) {
  const r = await fetch(`${FN_BASE}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify(body),
  })
  return r.json()
}

// ── Tool definitions sent to Claude ──────────────────────────────────────────
const TOOLS = [
  {
    name: 'get_fleet_briefing',
    description: 'Get a complete briefing of the user\'s certificate fleet — all certs, posture score, expiry warnings, install status, and CA/B Forum mandate readiness. Call this first at the start of every conversation.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_certs',
    description: 'List all SSL certificates for the user with their current status.',
    input_schema: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'active', 'expiring', 'expired'], description: 'Filter to apply' },
      },
    },
  },
  {
    name: 'get_posture_score',
    description: 'Calculate and return the fleet posture score (0-100) with breakdown and CA/B Forum mandate readiness.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'check_mandate_readiness',
    description: 'Check compliance with CA/B Forum SC-081v3 mandates: 200-day by Mar 2026, 100-day by Mar 2027, 47-day by Mar 2029.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_cert_detail',
    description: 'Get full details for a specific certificate including DCV records, vault status, and install state.',
    input_schema: {
      type: 'object',
      properties: { cert_id: { type: 'string', description: 'Certificate UUID' } },
      required: ['cert_id'],
    },
  },
  {
    name: 'issue_cert',
    description: 'Issue a new RapidSSL DV certificate. This is a MUTATING action — only call after the user explicitly confirms. Always ask for confirmation first.',
    input_schema: {
      type: 'object',
      properties: {
        domain:     { type: 'string' },
        firstName:  { type: 'string' },
        lastName:   { type: 'string' },
        adminEmail: { type: 'string' },
        phone:      { type: 'string' },
        period:     { type: 'number', description: 'Months (default 12)' },
        confirmed:  { type: 'boolean', description: 'Must be true — user has explicitly confirmed' },
      },
      required: ['domain', 'firstName', 'lastName', 'adminEmail', 'phone'],
    },
  },
  {
    name: 'renew_cert',
    description: 'Renew a certificate with a new GoGetSSL order. MUTATING — always confirm with user first.',
    input_schema: {
      type: 'object',
      properties: {
        cert_id:   { type: 'string' },
        period:    { type: 'number' },
        confirmed: { type: 'boolean' },
      },
      required: ['cert_id'],
    },
  },
  {
    name: 'reissue_cert',
    description: 'Reissue a certificate with a fresh private key on the same order. MUTATING — confirm with user first.',
    input_schema: {
      type: 'object',
      properties: {
        cert_id:   { type: 'string' },
        confirmed: { type: 'boolean' },
      },
      required: ['cert_id'],
    },
  },
  {
    name: 'install_cert',
    description: 'Install an active certificate on a cPanel server. MUTATING — confirm with user first.',
    input_schema: {
      type: 'object',
      properties: {
        cert_id:       { type: 'string' },
        credential_id: { type: 'string' },
        confirmed:     { type: 'boolean' },
      },
      required: ['cert_id'],
    },
  },
  {
    name: 'check_cert_status',
    description: 'Force-sync certificate status from GoGetSSL and return current state.',
    input_schema: {
      type: 'object',
      properties: { cert_id: { type: 'string' } },
      required: ['cert_id'],
    },
  },
  {
    name: 'list_agents',
    description: 'List all VPS agents connected to SSLVault.',
    input_schema: { type: 'object', properties: {} },
  },
]

// ── Tool execution ────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userId: string,
  authHeader: string
): Promise<string> {
  const db = adminDb()

  // ── get_fleet_briefing ────────────────────────────────────────────────────
  if (name === 'get_fleet_briefing') {
    const [certsRes, agentsRes] = await Promise.all([
      db.from('certificates')
        .select('id,domain,status,expires_at,is_live_on_server,auto_renew_enabled,keylocker_key_id,cert_type,ggs_order_id,install_method')
        .eq('user_id', userId).neq('status', 'cancelled').order('expires_at', { ascending: true }),
      db.from('persistent_agents')
        .select('hostname,status,last_seen_at').eq('user_id', userId).limit(5),
    ])
    const certs  = certsRes.data  || []
    const agents = agentsRes.data || []
    if (!certs.length) return 'No certificates found in this account. The user has not issued any certs yet.'

    const now    = Date.now()
    const active = certs.filter((c: any) => c.status === 'active')
    const expiring = active.filter((c: any) => {
      const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
      return d !== null && d >= 0 && d <= 30
    })
    const notInstalled = active.filter((c: any) => !c.is_live_on_server)
    const noAutoRenew  = certs.filter((c: any) => c.auto_renew_enabled === false)

    const installed = certs.filter((c: any) => c.is_live_on_server).length
    const autoRenew = certs.filter((c: any) => c.auto_renew_enabled !== false).length
    const keyVault  = certs.filter((c: any) => c.keylocker_key_id).length
    const healthy   = active.filter((c: any) => {
      const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
      return d !== null && d > 30
    }).length
    const total  = certs.length
    const ip = total > 0 ? Math.round(installed / total * 100) : 0
    const rp = total > 0 ? Math.round(autoRenew / total * 100) : 0
    const hp = active.length > 0 ? Math.round(healthy / active.length * 100) : 100
    const kp = total > 0 ? Math.round(keyVault / total * 100) : 0
    const score = Math.round(ip * 0.30 + rp * 0.30 + hp * 0.25 + kp * 0.15)

    const m200 = certs.filter((c: any) => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d <= 200 }).length
    const m100 = certs.filter((c: any) => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d <= 100 }).length
    const m47  = certs.filter((c: any) => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null; return d !== null && d <= 47  }).length

    const certLines = certs.map((c: any) => {
      const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
      const status = d === null ? 'pending' : d < 0 ? 'EXPIRED' : d <= 30 ? `expiring in ${d}d` : `${d}d left`
      return `- ${c.domain} [ID:${c.id}] | ${c.status} | ${status} | ${c.is_live_on_server ? 'LIVE' : 'NOT INSTALLED'} | auto-renew:${c.auto_renew_enabled !== false ? 'ON' : 'OFF'} | key:${c.keylocker_key_id ? 'secured' : 'missing'} | method:${c.install_method || 'none'}`
    }).join('\n')

    const agentLines = agents.length
      ? agents.map((a: any) => `- ${a.hostname || 'unknown'} | ${a.status} | last seen: ${a.last_seen_at ? Math.round((Date.now() - new Date(a.last_seen_at).getTime()) / 60000) + 'm ago' : 'never'}`).join('\n')
      : 'No VPS agents connected.'

    return [
      `=== FLEET BRIEFING ===`,
      `Total certs: ${total} | Active: ${active.length} | Posture score: ${score}/100`,
      ``,
      `CERTIFICATES:`,
      certLines,
      ``,
      `ALERTS:`,
      expiring.length   ? `- ${expiring.length} cert(s) expiring within 30 days: ${expiring.map((c: any) => c.domain).join(', ')}` : '- No certs expiring soon',
      notInstalled.length ? `- ${notInstalled.length} cert(s) NOT installed on server: ${notInstalled.map((c: any) => c.domain).join(', ')}` : '- All certs installed',
      noAutoRenew.length  ? `- ${noAutoRenew.length} cert(s) have auto-renew DISABLED: ${noAutoRenew.map((c: any) => c.domain).join(', ')}` : '- All certs have auto-renew',
      ``,
      `POSTURE BREAKDOWN:`,
      `Install: ${ip}% | Auto-renew: ${rp}% | Health: ${hp}% | Key vault: ${kp}%`,
      ``,
      `CA/B FORUM MANDATE (SC-081v3):`,
      `Mar 2026 (200d): ${m200}/${total} ready`,
      `Mar 2027 (100d): ${m100}/${total} ready`,
      `Mar 2029 (47d):  ${m47}/${total} ready`,
      ``,
      `AGENTS:`,
      agentLines,
    ].join('\n')
  }

  // ── list_certs ────────────────────────────────────────────────────────────
  if (name === 'list_certs') {
    const filter = (input.filter as string) || 'all'
    const { data: certs, error } = await db.from('certificates')
      .select('id,domain,status,expires_at,is_live_on_server,auto_renew_enabled,cert_type,ggs_order_id,keylocker_key_id')
      .eq('user_id', userId).neq('status', 'cancelled').order('expires_at', { ascending: true })
    if (error) return `Error: ${error.message}`
    if (!certs?.length) return 'No certificates found.'
    const now = Date.now()
    const filtered = certs.filter((c: any) => {
      const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
      if (filter === 'active')   return c.status === 'active' && (d ?? 0) > 0
      if (filter === 'expiring') return c.status === 'active' && d !== null && d >= 0 && d <= 30
      if (filter === 'expired')  return d !== null && d < 0
      return true
    })
    return filtered.map((c: any, i: number) => [
      `${i + 1}. ${c.domain} [ID: ${c.id}]`,
      `   Status: ${c.status} | ${daysLabel(c.expires_at)}`,
      `   ${c.is_live_on_server ? 'LIVE' : 'NOT INSTALLED'} | auto-renew: ${c.auto_renew_enabled !== false ? 'ON' : 'OFF'} | key: ${c.keylocker_key_id ? 'secured' : 'missing'}`,
    ].join('\n')).join('\n\n')
  }

  // ── get_posture_score ─────────────────────────────────────────────────────
  if (name === 'get_posture_score') {
    const { data: certs } = await db.from('certificates')
      .select('status,expires_at,is_live_on_server,auto_renew_enabled,keylocker_key_id,dns_provider_id')
      .eq('user_id', userId).neq('status', 'cancelled')
    if (!certs?.length) return 'No certificates to score.'
    const total     = certs.length
    const active    = certs.filter((c: any) => c.status === 'active')
    const installed = certs.filter((c: any) => c.is_live_on_server).length
    const autoRenew = certs.filter((c: any) => c.auto_renew_enabled !== false).length
    const keyVault  = certs.filter((c: any) => c.keylocker_key_id).length
    const healthy   = active.filter((c: any) => { const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000) : null; return d !== null && d > 30 }).length
    const ip = total > 0 ? Math.round(installed / total * 100) : 0
    const rp = total > 0 ? Math.round(autoRenew / total * 100) : 0
    const hp = active.length > 0 ? Math.round(healthy / active.length * 100) : 100
    const kp = total > 0 ? Math.round(keyVault / total * 100) : 0
    const score = Math.round(ip * 0.30 + rp * 0.30 + hp * 0.25 + kp * 0.15)
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
    return `Posture score: ${score}/100 (Grade ${grade})\nInstall: ${ip}% | Auto-renew: ${rp}% | Health: ${hp}% | Key vault: ${kp}%`
  }

  // ── check_mandate_readiness ───────────────────────────────────────────────
  if (name === 'check_mandate_readiness') {
    const { data: certs } = await db.from('certificates')
      .select('id,domain,expires_at,auto_renew_enabled').eq('user_id', userId).eq('status', 'active')
    if (!certs?.length) return 'No active certificates.'
    const now = Date.now()
    const wd = certs.map((c: any) => ({ ...c, dL: c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null }))
    const lines: string[] = []
    for (const m of [{ year: 'Mar 2026', max: 200 }, { year: 'Mar 2027', max: 100 }, { year: 'Mar 2029', max: 47 }]) {
      const ready = wd.filter((c: any) => c.dL !== null && c.dL <= m.max)
      const notReady = wd.filter((c: any) => c.dL !== null && c.dL > m.max)
      lines.push(`${m.year} (${m.max}d max): ${ready.length}/${certs.length} ready ${ready.length === certs.length ? '✓' : '!'}`)
      notReady.forEach((c: any) => lines.push(`  NOT READY: ${c.domain} (${c.dL}d) — ${c.auto_renew_enabled !== false ? 'auto-renew will fix at renewal' : 'MANUAL ACTION NEEDED'}`))
    }
    return lines.join('\n')
  }

  // ── get_cert_detail ───────────────────────────────────────────────────────
  if (name === 'get_cert_detail') {
    const { data: c } = await db.from('certificates').select('*').eq('id', input.cert_id).eq('user_id', userId).single()
    if (!c) return `Certificate not found: ${input.cert_id}`
    return `Domain: ${c.domain}\nID: ${c.id}\nStatus: ${c.status}\nExpiry: ${c.expires_at} (${daysLabel(c.expires_at)})\nLive: ${c.is_live_on_server ? 'Yes' : 'No'}\nAuto-renew: ${c.auto_renew_enabled !== false ? 'On' : 'Off'}\nKey vault: ${c.keylocker_key_id ? 'Secured' : 'Not stored'}\nInstall method: ${c.install_method || 'none'}\nGGS order: ${c.ggs_order_id || 'n/a'}`
  }

  // ── MUTATING ACTIONS ──────────────────────────────────────────────────────
  // All mutating tools require confirmed: true before executing.
  // The AI is instructed to ask for confirmation first. If the client
  // sends confirmed: false or omits it, we return a confirmation request
  // string that the AI surfaces to the user.

  if (name === 'issue_cert') {
    if (!input.confirmed) return `CONFIRMATION_REQUIRED:issue_cert:Issue a new RapidSSL certificate for ${input.domain}? This will place a real GoGetSSL order.`
    const r = await callFn('gogetssl-issue', {
      action: 'place_order', domain: input.domain, firstName: input.firstName,
      lastName: input.lastName, adminEmail: input.adminEmail, phone: input.phone,
      period: input.period || 12, product_code: 'rapidssl',
    }, authHeader)
    if (!r.ok) return `Issue failed: ${r.error || r.message}`
    return `Certificate order placed for ${input.domain}! GGS #${r.ggs_order_id || 'pending'}. DNS validation running — ~2-5 min.`
  }

  if (name === 'renew_cert') {
    if (!input.confirmed) {
      const { data: c } = await db.from('certificates').select('domain').eq('id', input.cert_id).eq('user_id', userId).single()
      return `CONFIRMATION_REQUIRED:renew_cert:Renew the certificate for ${c?.domain || input.cert_id}? This places a new 12-month GoGetSSL order.`
    }
    const r = await callFn('gogetssl-issue', { action: 'renew', cert_id: input.cert_id, period: input.period || 12, triggered_by: 'vaultbrain_v2' }, authHeader)
    if (!r.ok) return `Renewal failed: ${r.error || r.message}`
    return `Renewal order placed! GGS #${r.ggs_order_id || 'pending'}. Will activate in ~2-5 min.`
  }

  if (name === 'reissue_cert') {
    if (!input.confirmed) {
      const { data: c } = await db.from('certificates').select('domain').eq('id', input.cert_id).eq('user_id', userId).single()
      return `CONFIRMATION_REQUIRED:reissue_cert:Reissue the certificate for ${c?.domain || input.cert_id} with a fresh private key? No extra charge.`
    }
    const r = await callFn('gogetssl-issue', { action: 'reissue', cert_id: input.cert_id, triggered_by: 'vaultbrain_v2' }, authHeader)
    if (!r.ok) return `Reissue failed: ${r.error || r.message}`
    return `Reissue initiated! Fresh RSA-2048 key generated. Will activate in ~2-5 min.`
  }

  if (name === 'install_cert') {
    if (!input.confirmed) {
      const { data: c } = await db.from('certificates').select('domain').eq('id', input.cert_id).eq('user_id', userId).single()
      return `CONFIRMATION_REQUIRED:install_cert:Install the certificate for ${c?.domain || input.cert_id} on your cPanel server?`
    }
    const { data: cert } = await db.from('certificates').select('domain,status,is_live_on_server').eq('id', input.cert_id).eq('user_id', userId).single()
    if (!cert) return `Certificate not found: ${input.cert_id}`
    if (cert.status !== 'active') return `Cannot install — cert status is ${cert.status}. Must be active first.`
    if (cert.is_live_on_server) return `Already installed and live on server for ${cert.domain}.`
    const body: Record<string, unknown> = { action: 'install', cert_id: input.cert_id, domain: cert.domain }
    if (input.credential_id) body.credential_id = input.credential_id
    const r = await callFn('cpanel-install', body, authHeader)
    if (!r.ok) return `Install failed: ${r.error || r.message}`
    return `Certificate installed on ${cert.domain}! HTTPS is live.`
  }

  if (name === 'check_cert_status') {
    const { data: cert } = await db.from('certificates').select('id,domain,ggs_order_id,status,expires_at,is_live_on_server').eq('id', input.cert_id).eq('user_id', userId).single()
    if (!cert) return `Certificate not found: ${input.cert_id}`
    const { data: order } = await db.from('ssl_orders').select('id').eq('ggs_order_id', cert.ggs_order_id).eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).single()
    if (order?.id) await callFn('gogetssl-issue', { action: 'check_status', order_id: order.id }, authHeader)
    const { data: fresh } = await db.from('certificates').select('status,expires_at,is_live_on_server').eq('id', input.cert_id).single()
    const st = fresh?.status || cert.status
    return `${cert.domain}: ${st}${st === 'active' ? ' (ACTIVE)' : ' (PENDING)'}\n${st === 'active' ? `Expires: ${fresh?.expires_at} (${daysLabel(fresh?.expires_at || null)})` : 'Still being issued.'}\nLive on server: ${fresh?.is_live_on_server ? 'Yes' : 'No'}`
  }

  if (name === 'list_agents') {
    const { data: agents } = await db.from('persistent_agents')
      .select('id,hostname,ip_address,status,last_seen_at,version').eq('user_id', userId).order('last_seen_at', { ascending: false })
    if (!agents?.length) return 'No VPS agents registered.'
    return agents.map((a: any, i: number) => {
      const ls = a.last_seen_at ? `${Math.round((Date.now() - new Date(a.last_seen_at).getTime()) / 60000)}m ago` : 'never'
      return `${i + 1}. ${a.hostname || 'unknown'} (${a.ip_address || 'no IP'}) | ${a.status} | last seen: ${ls} | v${a.version || '?'}`
    }).join('\n')
  }

  return `Unknown tool: ${name}`
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = await req.json()
    const { messages = [], token, confirmed_action } = body

    if (!ANTHROPIC_KEY) return json({ ok: false, error: 'AI not configured' }, 503)
    if (!token)         return json({ ok: false, error: 'token required' }, 401)

    // Authenticate user
    const { data: { user } } = await createClient(SB_URL, SB_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }).auth.getUser()
    if (!user) return json({ ok: false, error: 'Invalid token' }, 401)

    const authHeader = `Bearer ${token}`

    // System prompt — sets the tone and rules for the AI
    const systemPrompt = `You are VaultBrain, SSLVault's built-in AI certificate advisor. You are a PKI expert who speaks in plain language.

You have direct access to the user's live certificate data through tools. Always start a new conversation by calling get_fleet_briefing to know exactly what the user has.

PERSONALITY:
- Proactive: don't wait to be asked. If you see a problem (expired cert, not installed, auto-renew off), mention it.
- Plain language: explain things simply. The user may not know what "DCV" means.
- Specific: use real domain names and dates from their actual data, never generic examples.
- Action-oriented: suggest what to do, not just what's wrong.

RULES FOR ACTIONS (issue, renew, reissue, install):
1. ALWAYS explain what you are about to do before doing it.
2. ALWAYS ask "Shall I go ahead?" before calling any mutating tool.
3. Only call the tool with confirmed:true after the user says yes/confirm/go ahead/proceed.
4. If a tool returns CONFIRMATION_REQUIRED:..., surface the confirmation message to the user and wait.
5. Never take action automatically — the user must always approve.

SMART BEHAVIOUR:
- If you see a cert NOT INSTALLED, proactively suggest installing it.
- If you see auto-renew OFF, flag it as a risk.
- If the posture score is below 80, explain what is dragging it down.
- If a mandate deadline is approaching, explain what it means in plain terms.

Keep responses concise. Use bullet points for lists. Use bold for important values.`

    // Build message history for Claude — map our format to Anthropic's
    const claudeMessages = (messages as any[]).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    // Call Claude with tool-use
    let response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: claudeMessages,
      }),
    })

    let data = await response.json()

    // Agentic loop — keep going until Claude stops using tools
    let loopCount = 0
    const MAX_LOOPS = 6
    let fullMessages = [...claudeMessages]

    while (data.stop_reason === 'tool_use' && loopCount < MAX_LOOPS) {
      loopCount++

      // Add Claude's response (with tool_use blocks) to message history
      fullMessages.push({ role: 'assistant', content: data.content })

      // Execute all tool calls and collect results
      const toolResults: any[] = []
      for (const block of data.content) {
        if (block.type !== 'tool_use') continue

        // If this is a mutating action and client sent confirmed_action matching,
        // inject confirmed:true so the tool proceeds
        const toolInput = { ...block.input }
        if (confirmed_action && confirmed_action.tool === block.name && confirmed_action.confirmed) {
          toolInput.confirmed = true
        }

        const result = await executeTool(block.name, toolInput, user.id, authHeader)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }

      // Add tool results to history
      fullMessages.push({ role: 'user', content: toolResults })

      // Call Claude again with the results
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          tools: TOOLS,
          messages: fullMessages,
        }),
      })
      data = await response.json()
    }

    // Extract final text response
    const text = data.content?.find((b: any) => b.type === 'text')?.text || 'No response generated.'

    // Check if any tool result contains a CONFIRMATION_REQUIRED signal
    // This means a mutating action needs user approval — send it as a special response type
    const pendingConfirmation = (() => {
      for (const msg of fullMessages) {
        if (!Array.isArray(msg.content)) continue
        for (const block of msg.content) {
          if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.startsWith('CONFIRMATION_REQUIRED:')) {
            const parts = block.content.replace('CONFIRMATION_REQUIRED:', '').split(':')
            return { tool: parts[0], message: parts.slice(1).join(':') }
          }
        }
      }
      return null
    })()

    return json({
      ok: true,
      answer: text,
      pending_confirmation: pendingConfirmation,
      usage: data.usage,
    })

  } catch (e: any) {
    console.error('VaultBrain v2 error:', e)
    return json({ ok: false, error: e.message }, 500)
  }
})
