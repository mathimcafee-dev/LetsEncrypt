// SSLVault MCP Server v1
//
// Model Context Protocol server for SSLVault — lets any MCP-compatible AI agent
// (Claude Desktop, Cursor, Copilot, etc.) manage certificates using plain English.
//
// Transport: Streamable HTTP (Web Standards — runs natively on Deno/Supabase edge)
// Auth:      Supabase user JWT — same Bearer token used by the web app
// Tools:     10 certificate lifecycle actions mapped to existing edge functions
//
// Claude Desktop config (user pastes this into ~/Library/Application Support/Claude/claude_desktop_config.json):
// {
//   "mcpServers": {
//     "sslvault": {
//       "url": "https://frthcwkntciaakqsppss.supabase.co/functions/v1/sslvault-mcp",
//       "headers": { "Authorization": "Bearer <supabase-jwt-or-api-token>" }
//     }
//   }
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── MCP SDK imports (Web Standards transport — works on Deno) ─────────────────
import { McpServer } from 'https://esm.sh/@modelcontextprotocol/sdk@1.10.2/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from 'https://esm.sh/@modelcontextprotocol/sdk@1.10.2/server/webStandardStreamableHttp.js'
import { z } from 'https://esm.sh/zod@3.23.8'

// ── Constants ─────────────────────────────────────────────────────────────────
const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_ANON    = Deno.env.get('SUPABASE_ANON_KEY')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FN_BASE    = `${SB_URL}/functions/v1`

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, last-event-id, mcp-protocol-version, accept',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Expose-Headers':'mcp-session-id, mcp-protocol-version',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function adminDb() {
  return createClient(SB_URL, SB_SERVICE)
}

// Validate the incoming JWT and return the Supabase user.
// The user token from the web app works directly — no extra API key needed.
async function getUser(authHeader: string) {
  if (!authHeader) return null
  const db = createClient(SB_URL, SB_ANON, {
    global: { headers: { Authorization: authHeader } }
  })
  const { data: { user } } = await db.auth.getUser()
  return user
}

// Forward a call to an existing SSLVault edge function, injecting the user's token
async function callFn(fnName: string, body: Record<string, unknown>, authHeader: string) {
  const res = await fetch(`${FN_BASE}/${fnName}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body:    JSON.stringify(body),
  })
  return res.json()
}

// Format a days-left number into a human label
function daysLabel(iso: string | null): string {
  if (!iso) return 'unknown'
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0)  return `EXPIRED ${Math.abs(days)}d ago`
  if (days === 0) return 'expires today'
  return `${days}d left`
}

// ── MCP Server factory — one fresh server per request (stateless mode) ────────
function buildMcpServer(authHeader: string): McpServer {
  const server = new McpServer({
    name:    'sslvault',
    version: '1.0.0',
  })

  // ── TOOL 1: list_certs ────────────────────────────────────────────────────
  // Returns all certificates for the authenticated user.
  // The AI uses this to answer "what certs do I have?" or find a cert_id.
  server.registerTool(
    'list_certs',
    {
      title:       'List all certificates',
      description: 'Returns every SSL certificate in your SSLVault account — domain, expiry, status, install state, and auto-renew flag. Use this first to find cert IDs before taking any action.',
      inputSchema: {
        filter: z.enum(['all', 'active', 'expiring', 'expired']).optional()
          .describe('Filter: all (default), active, expiring (≤30d), expired'),
      },
    },
    async ({ filter = 'all' }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated. Add your SSLVault JWT to the MCP config.' }] }

      const db = adminDb()
      let q = db.from('certificates')
        .select('id, domain, status, expires_at, issued_at, is_live_on_server, auto_renew_enabled, cert_type, install_method, ggs_order_id, keylocker_key_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .order('expires_at', { ascending: true })

      const { data: certs, error } = await q
      if (error) return { content: [{ type: 'text', text: `❌ DB error: ${error.message}` }] }
      if (!certs?.length) return { content: [{ type: 'text', text: 'No certificates found in your SSLVault account.' }] }

      const now = Date.now()
      let filtered = certs.filter(c => {
        const days = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
        if (filter === 'active')   return c.status === 'active' && (days ?? 0) > 0
        if (filter === 'expiring') return c.status === 'active' && days !== null && days >= 0 && days <= 30
        if (filter === 'expired')  return days !== null && days < 0
        return true
      })

      const lines = filtered.map((c, i) => {
        const days = daysLabel(c.expires_at)
        const live  = c.is_live_on_server ? '🟢 live' : '🔴 not installed'
        const renew = c.auto_renew_enabled !== false ? '♻️ auto-renew on' : '⚠️ auto-renew off'
        const key   = c.keylocker_key_id ? '🔐 key secured' : '⚠️ no key stored'
        return `${i+1}. ${c.domain}\n   ID: ${c.id}\n   Status: ${c.status} · ${days}\n   ${live} · ${renew} · ${key}\n   Type: ${c.cert_type || 'RapidSSL Standard'} · GGS #${c.ggs_order_id || 'n/a'}`
      })

      return { content: [{ type: 'text', text: `📋 ${filtered.length} certificate(s):\n\n${lines.join('\n\n')}` }] }
    }
  )

  // ── TOOL 2: get_cert ──────────────────────────────────────────────────────
  // Returns full detail for a single certificate including order contact info.
  server.registerTool(
    'get_cert',
    {
      title:       'Get certificate detail',
      description: 'Returns full details for a single certificate — validity dates, DCV records, order info, key vault status, and installation state.',
      inputSchema: {
        cert_id: z.string().describe('The certificate UUID from list_certs'),
      },
    },
    async ({ cert_id }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const db = adminDb()
      const { data: cert, error } = await db.from('certificates')
        .select('*')
        .eq('id', cert_id)
        .eq('user_id', user.id)
        .single()

      if (error || !cert) return { content: [{ type: 'text', text: `❌ Certificate not found: ${cert_id}` }] }

      const days = daysLabel(cert.expires_at)
      const text = [
        `🏷️  Domain:       ${cert.domain}`,
        `📋  ID:           ${cert.id}`,
        `📊  Status:       ${cert.status}`,
        `⏳  Expiry:       ${cert.expires_at || 'unknown'} (${days})`,
        `📅  Issued:       ${cert.issued_at || 'unknown'}`,
        `🌐  Live on server: ${cert.is_live_on_server ? 'Yes' : 'No'}`,
        `♻️  Auto-renew:  ${cert.auto_renew_enabled !== false ? 'Enabled' : 'Disabled'}`,
        `🔐  Key in vault: ${cert.keylocker_key_id ? 'Yes — ' + cert.keylocker_key_id.slice(0, 8) + '…' : 'No'}`,
        `🖥️  Install method: ${cert.install_method || 'none'}`,
        `🔢  GGS order ID: ${cert.ggs_order_id || 'n/a'}`,
        `📦  Cert type:   ${cert.cert_type || 'RapidSSL Standard'}`,
        `🔑  DCV TXT name: ${cert.dcv_txt_name || 'n/a'}`,
        `🔑  DCV TXT value: ${cert.dcv_txt_value ? cert.dcv_txt_value.slice(0, 30) + '…' : 'n/a'}`,
      ].join('\n')

      return { content: [{ type: 'text', text: text }] }
    }
  )

  // ── TOOL 3: get_posture ───────────────────────────────────────────────────
  // Returns the fleet posture score — the "how healthy is my fleet?" tool.
  // Investors love this. Computes install%, auto-renew%, healthy%, mandate readiness.
  server.registerTool(
    'get_posture',
    {
      title:       'Get fleet posture score',
      description: 'Returns a 0–100 posture score for your entire certificate fleet, broken down by install rate, auto-renew rate, health, key vault coverage, and CA/B Forum mandate readiness for 2026/2027/2029.',
      inputSchema: {},
    },
    async () => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const db = adminDb()
      const { data: certs } = await db.from('certificates')
        .select('id, status, expires_at, is_live_on_server, auto_renew_enabled, keylocker_key_id, dns_provider_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled')

      if (!certs?.length) return { content: [{ type: 'text', text: 'No certificates found. Issue your first cert to get a posture score.' }] }

      const total     = certs.length
      const active    = certs.filter(c => c.status === 'active')
      const installed = certs.filter(c => c.is_live_on_server).length
      const autoRenew = certs.filter(c => c.auto_renew_enabled !== false).length
      const keyVault  = certs.filter(c => c.keylocker_key_id).length
      const dcvReady  = certs.filter(c => c.dns_provider_id).length
      const healthy   = active.filter(c => {
        const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000) : null
        return d !== null && d > 30
      }).length

      // Mandate readiness: certs with validity ≤ threshold are "ready"
      const mandate200 = certs.filter(c => {
        const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000) : null
        return d !== null && d <= 200
      }).length
      const mandate100 = certs.filter(c => {
        const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000) : null
        return d !== null && d <= 100
      }).length
      const mandate47 = certs.filter(c => {
        const d = c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - Date.now()) / 86400000) : null
        return d !== null && d <= 47
      }).length

      const installPct  = total > 0 ? Math.round((installed  / total) * 100) : 0
      const renewPct    = total > 0 ? Math.round((autoRenew  / total) * 100) : 0
      const healthPct   = active.length > 0 ? Math.round((healthy / active.length) * 100) : 100
      const keyPct      = total > 0 ? Math.round((keyVault   / total) * 100) : 0

      const score = Math.round((installPct * 0.30) + (renewPct * 0.30) + (healthPct * 0.25) + (keyPct * 0.15))
      const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F'
      const label = score >= 80 ? 'Excellent' : score >= 60 ? 'At risk' : 'Critical'

      const text = [
        `🛡️  SSLVault Fleet Posture Report`,
        ``,
        `Overall score: ${score}/100 — Grade ${grade} (${label})`,
        ``,
        `📊 Breakdown:`,
        `  Install rate:    ${installPct}% (${installed}/${total} certs live on server)`,
        `  Auto-renew:     ${renewPct}% (${autoRenew}/${total} certs have auto-renew enabled)`,
        `  Health:         ${healthPct}% (${healthy}/${active.length} active certs >30d from expiry)`,
        `  Key vault:      ${keyPct}% (${keyVault}/${total} private keys secured in CertVault)`,
        ``,
        `📅 CA/B Forum mandate readiness:`,
        `  Mar 2026 (200d max): ${mandate200}/${total} ready ${mandate200 === total ? '✅' : '⚠️'}`,
        `  Mar 2027 (100d max): ${mandate100}/${total} ready ${mandate100 === total ? '✅' : '⚠️'}`,
        `  Mar 2029 (47d max):  ${mandate47}/${total} ready ${mandate47 === total ? '✅' : '⚠️'}`,
        ``,
        `💡 Total certificates: ${total} · Active: ${active.length} · DCV-ready: ${dcvReady}`,
      ].join('\n')

      return { content: [{ type: 'text', text: text }] }
    }
  )

  // ── TOOL 4: issue_cert ────────────────────────────────────────────────────
  // Issues a new RapidSSL DV certificate via GoGetSSL. Full flow.
  server.registerTool(
    'issue_cert',
    {
      title:       'Issue a new SSL certificate',
      description: 'Issues a new RapidSSL Standard DV certificate for a domain via GoGetSSL. Automatically generates CSR/key pair, adds DNS TXT record for validation, and polls until issued. Returns the order ID.',
      inputSchema: {
        domain:     z.string().describe('Domain to secure, e.g. example.com'),
        firstName:  z.string().describe('Admin first name for the certificate contact'),
        lastName:   z.string().describe('Admin last name'),
        adminEmail: z.string().describe('Admin email address'),
        phone:      z.string().describe('Admin phone number, e.g. +31612345678'),
        period:     z.number().optional().describe('Validity period in months (default 12)'),
      },
    },
    async ({ domain, firstName, lastName, adminEmail, phone, period = 12 }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const result = await callFn('gogetssl-issue', {
        action: 'place_order',
        domain, firstName, lastName, adminEmail, phone, period,
        product_code: 'rapidssl',
      }, authHeader)

      if (!result.ok) {
        return { content: [{ type: 'text', text: `❌ Issue failed: ${result.error || result.message || JSON.stringify(result)}` }] }
      }

      return { content: [{ type: 'text', text: [
        `✅ Certificate order placed successfully!`,
        ``,
        `Domain:     ${domain}`,
        `GGS order:  #${result.ggs_order_id || 'pending'}`,
        `DCV method: DNS TXT record`,
        ``,
        `DNS validation is running automatically. The certificate will be issued in ~2–5 minutes.`,
        `Use check_cert_status with the cert ID to monitor progress.`,
        result.dcv_txt_name ? `\nDNS TXT name:  ${result.dcv_txt_name}` : '',
        result.dcv_txt_value ? `DNS TXT value: ${result.dcv_txt_value}` : '',
      ].join('\n') }] }
    }
  )

  // ── TOOL 5: renew_cert ────────────────────────────────────────────────────
  // Places a new GGS renewal order (new billing period) for an existing cert.
  server.registerTool(
    'renew_cert',
    {
      title:       'Renew a certificate',
      description: 'Renews a certificate by placing a brand-new GoGetSSL order for another 12-month period. Use this when the subscription period is ending. Different from reissue — this creates new billing.',
      inputSchema: {
        cert_id: z.string().describe('Certificate UUID from list_certs'),
        period:  z.number().optional().describe('New period in months (default 12)'),
      },
    },
    async ({ cert_id, period = 12 }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const result = await callFn('gogetssl-issue', {
        action: 'renew',
        cert_id, period,
        triggered_by: 'mcp_agent',
      }, authHeader)

      if (!result.ok) {
        return { content: [{ type: 'text', text: `❌ Renewal failed: ${result.error || result.message}` }] }
      }

      return { content: [{ type: 'text', text: [
        `✅ Renewal order placed!`,
        `New GGS order: #${result.ggs_order_id || 'pending'}`,
        `DNS validation running automatically. Certificate will activate in ~2–5 minutes.`,
        `Use check_cert_status to monitor.`,
      ].join('\n') }] }
    }
  )

  // ── TOOL 6: reissue_cert ──────────────────────────────────────────────────
  // Reissues on the SAME GGS order — generates a new key pair, same billing.
  server.registerTool(
    'reissue_cert',
    {
      title:       'Reissue a certificate',
      description: 'Reissues a certificate with a fresh RSA-2048 key pair on the same GoGetSSL order (no new billing). Use this to rotate the private key or get a fresh cert after a security event.',
      inputSchema: {
        cert_id: z.string().describe('Certificate UUID from list_certs'),
      },
    },
    async ({ cert_id }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const result = await callFn('gogetssl-issue', {
        action: 'reissue',
        cert_id,
        triggered_by: 'mcp_agent',
      }, authHeader)

      if (!result.ok) {
        return { content: [{ type: 'text', text: `❌ Reissue failed: ${result.error || result.message}` }] }
      }

      return { content: [{ type: 'text', text: [
        `✅ Reissue initiated — fresh RSA-2048 key pair generated.`,
        `GGS order: #${result.ggs_order_id || 'same order'}`,
        `DNS validation running. Certificate will activate in ~2–5 minutes.`,
        `Use check_cert_status to monitor.`,
      ].join('\n') }] }
    }
  )

  // ── TOOL 7: check_cert_status ─────────────────────────────────────────────
  // Force-syncs the cert status from GoGetSSL and returns current state.
  server.registerTool(
    'check_cert_status',
    {
      title:       'Check certificate status',
      description: 'Force-syncs the certificate status from GoGetSSL and returns the current state. Use this after issuing, renewing, or reissuing to see if the certificate has been issued yet.',
      inputSchema: {
        cert_id: z.string().describe('Certificate UUID from list_certs'),
      },
    },
    async ({ cert_id }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      // First get the cert to find its order ID
      const { data: cert } = await adminDb().from('certificates')
        .select('id, domain, ggs_order_id, status, expires_at, is_live_on_server')
        .eq('id', cert_id).eq('user_id', user.id).single()

      if (!cert) return { content: [{ type: 'text', text: `❌ Certificate not found: ${cert_id}` }] }

      // Find the latest ssl_order for this cert
      const { data: order } = await adminDb().from('ssl_orders')
        .select('id, status, ggs_status')
        .eq('ggs_order_id', cert.ggs_order_id)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1).single()

      let syncResult = null
      if (order?.id) {
        syncResult = await callFn('gogetssl-issue', {
          action: 'check_status',
          order_id: order.id,
        }, authHeader)
      }

      // Re-read cert after sync
      const { data: fresh } = await adminDb().from('certificates')
        .select('status, expires_at, is_live_on_server')
        .eq('id', cert_id).single()

      const status = fresh?.status || cert.status
      const isActive = status === 'active'

      return { content: [{ type: 'text', text: [
        `📊 Status for ${cert.domain}:`,
        ``,
        `Certificate status: ${status} ${isActive ? '✅' : '⏳'}`,
        isActive ? `Expires: ${fresh?.expires_at || cert.expires_at} (${daysLabel(fresh?.expires_at || cert.expires_at)})` : '',
        `Live on server: ${fresh?.is_live_on_server ? 'Yes ✅' : 'No — install pending'}`,
        syncResult?.ok === false ? `\nSync note: ${syncResult.error || syncResult.message}` : '',
        !isActive ? `\nCertificate is still being issued. DNS validation usually takes 2–5 minutes. Check again shortly.` : '',
      ].filter(Boolean).join('\n') }] }
    }
  )

  // ── TOOL 8: install_cert ──────────────────────────────────────────────────
  // Triggers cPanel auto-install for a certificate that has a cPanel credential stored.
  server.registerTool(
    'install_cert',
    {
      title:       'Install certificate on server',
      description: 'Triggers automatic certificate installation on a cPanel or VPS server that has a credential stored in SSLVault. The certificate must be active (issued) before installing.',
      inputSchema: {
        cert_id:       z.string().describe('Certificate UUID from list_certs'),
        credential_id: z.string().optional().describe('cPanel credential ID (optional — SSLVault will auto-detect if only one exists)'),
      },
    },
    async ({ cert_id, credential_id }) => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      // Check cert is active before trying to install
      const { data: cert } = await adminDb().from('certificates')
        .select('domain, status, is_live_on_server, install_method')
        .eq('id', cert_id).eq('user_id', user.id).single()

      if (!cert) return { content: [{ type: 'text', text: `❌ Certificate not found: ${cert_id}` }] }
      if (cert.status !== 'active') {
        return { content: [{ type: 'text', text: `❌ Cannot install — certificate status is "${cert.status}". It must be active/issued first.` }] }
      }
      if (cert.is_live_on_server) {
        return { content: [{ type: 'text', text: `✅ Certificate for ${cert.domain} is already installed and live on the server.` }] }
      }

      const result = await callFn('cpanel-install', {
        action: 'install',
        cert_id,
        domain: cert.domain,
        ...(credential_id ? { credential_id } : {}),
      }, authHeader)

      if (!result.ok) {
        return { content: [{ type: 'text', text: [
          `❌ Install failed: ${result.error || result.message}`,
          result.error?.includes('credential') ? `\nTip: Add a cPanel credential in SSLVault → Settings → Servers first.` : '',
        ].join('') }] }
      }

      return { content: [{ type: 'text', text: [
        `✅ Certificate installed successfully on ${cert.domain}!`,
        `Server: ${result.host || 'cPanel server'}`,
        `The certificate is now live and HTTPS is secured.`,
      ].join('\n') }] }
    }
  )

  // ── TOOL 9: list_agents ───────────────────────────────────────────────────
  // Lists persistent VPS agents registered in SSLVault.
  server.registerTool(
    'list_agents',
    {
      title:       'List persistent agents',
      description: 'Returns all VPS/server agents registered in SSLVault — hostname, IP, status, last seen, and version. Agents handle automatic certificate installation on VPS servers.',
      inputSchema: {},
    },
    async () => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const result = await callFn('agent-daemon', {
        action: 'list_agents',
        user_id: user.id,
      }, authHeader)

      if (!result.ok) return { content: [{ type: 'text', text: `❌ Error: ${result.error}` }] }
      if (!result.agents?.length) return { content: [{ type: 'text', text: 'No agents registered. Install the SSLVault agent on a VPS to enable automatic certificate installation.' }] }

      const lines = result.agents.map((a: any, i: number) => {
        const lastSeen = a.last_seen_at
          ? `last seen ${Math.round((Date.now() - new Date(a.last_seen_at).getTime()) / 60000)}m ago`
          : 'never seen'
        return `${i+1}. ${a.hostname || 'unknown'} (${a.ip_address || 'no IP'})\n   ID: ${a.id}\n   Status: ${a.status} · ${lastSeen} · v${a.version || '?'}`
      })

      return { content: [{ type: 'text', text: `🖥️ ${result.agents.length} agent(s):\n\n${lines.join('\n\n')}` }] }
    }
  )

  // ── TOOL 10: check_mandate_readiness ─────────────────────────────────────
  // Deep CA/B Forum compliance check — the differentiator vs Sectigo MCP.
  // Sectigo has no equivalent. This is SSLVault's unique advantage.
  server.registerTool(
    'check_mandate_readiness',
    {
      title:       'Check CA/B Forum mandate readiness',
      description: 'Analyses your entire certificate fleet against the CA/B Forum SC-081v3 mandate deadlines: 200-day max by March 2026, 100-day max by March 2027, 47-day max by March 2029. Returns which certs are compliant, which need action, and a readiness score.',
      inputSchema: {},
    },
    async () => {
      const user = await getUser(authHeader)
      if (!user) return { content: [{ type: 'text', text: '❌ Not authenticated.' }] }

      const { data: certs } = await adminDb().from('certificates')
        .select('id, domain, status, expires_at, auto_renew_enabled, is_live_on_server')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('status', 'cancelled')

      if (!certs?.length) return { content: [{ type: 'text', text: 'No active certificates to analyse.' }] }

      const now = Date.now()
      const withDays = certs.map(c => ({
        ...c,
        daysLeft: c.expires_at ? Math.ceil((new Date(c.expires_at).getTime() - now) / 86400000) : null
      }))

      const mandates = [
        { year: 'Mar 2026', ballot: 'SC-081v3', maxDays: 200, label: '200-day max validity' },
        { year: 'Mar 2027', ballot: 'SC-081v3', maxDays: 100, label: '100-day max validity' },
        { year: 'Mar 2029', ballot: 'SC-081v3', maxDays: 47,  label: '47-day max validity' },
      ]

      const lines: string[] = [
        `📋 CA/B Forum SC-081v3 Mandate Readiness Report`,
        `   ${certs.length} active certificate(s) analysed`,
        '',
      ]

      for (const m of mandates) {
        const ready    = withDays.filter(c => c.daysLeft !== null && c.daysLeft <= m.maxDays)
        const notReady = withDays.filter(c => c.daysLeft !== null && c.daysLeft > m.maxDays)
        const pct      = Math.round((ready.length / certs.length) * 100)
        const icon     = ready.length === certs.length ? '✅' : notReady.length === certs.length ? '❌' : '⚠️'

        lines.push(`${icon} ${m.year} — ${m.label}`)
        lines.push(`   Ballot: ${m.ballot} · Readiness: ${ready.length}/${certs.length} (${pct}%)`)

        if (notReady.length > 0) {
          lines.push(`   ❗ Not ready (current validity > ${m.maxDays}d):`)
          notReady.forEach(c => {
            const action = c.auto_renew_enabled !== false
              ? '♻️ auto-renew enabled — will comply automatically'
              : '⚠️ manual action required — enable auto-renew'
            lines.push(`     • ${c.domain} (${c.daysLeft}d left) — ${action}`)
          })
        } else {
          lines.push(`   All certificates are compliant with this mandate.`)
        }
        lines.push('')
      }

      // Overall compliance score
      const score200 = withDays.filter(c => c.daysLeft !== null && c.daysLeft <= 200).length / certs.length * 100
      const score100 = withDays.filter(c => c.daysLeft !== null && c.daysLeft <= 100).length / certs.length * 100
      const score47  = withDays.filter(c => c.daysLeft !== null && c.daysLeft <= 47 ).length / certs.length * 100
      const overall  = Math.round((score200 + score100 + score47) / 3)

      lines.push(`🏆 Overall mandate compliance score: ${overall}/100`)
      if (overall < 100) {
        lines.push(`💡 Tip: Enable auto-renew on all certificates to ensure automatic compliance as mandates take effect.`)
      } else {
        lines.push(`🎉 Your fleet is fully compliant with all current and upcoming CA/B Forum mandates!`)
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    }
  )

  return server
}

// ── Main request handler ──────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  // Health check — useful for testing the endpoint is reachable
  const url = new URL(req.url)
  if (url.pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ ok: true, service: 'sslvault-mcp', version: '1.0.0' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  // Extract auth header — passed through from Claude Desktop config
  const authHeader = req.headers.get('Authorization') || ''

  // Build a fresh MCP server per request (stateless mode requirement)
  const mcpServer = buildMcpServer(authHeader)

  // Build a fresh stateless transport per request
  // sessionIdGenerator: undefined = stateless mode (correct for Supabase edge fns)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })

  // Connect server to transport, then handle the request
  await mcpServer.connect(transport)

  // handleRequest returns a Web Standard Response — pass it straight through
  const response = await transport.handleRequest(req)

  // Add CORS headers to the MCP response
  const newHeaders = new Headers(response.headers)
  Object.entries(CORS).forEach(([k, v]) => newHeaders.set(k, v))

  return new Response(response.body, {
    status:  response.status,
    headers: newHeaders,
  })
})
