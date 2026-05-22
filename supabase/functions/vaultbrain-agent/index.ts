import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SB_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

function adminDb() { return createClient(SB_URL, SERVICE_KEY) }

async function getUserContext(userId: string): Promise<string> {
  const db = adminDb()
  const [certsRes, ordersRes] = await Promise.all([
    db.from('certificates').select('domain, status, expires_at, cert_type').eq('user_id', userId).order('expires_at', { ascending: true }).limit(20),
    db.from('ssl_orders').select('domain, status, created_at, ggs_order_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
  ])
  const certs  = certsRes.data  || []
  const orders = ordersRes.data || []
  const now = new Date()
  const lines: string[] = [
    `User has ${certs.length} certificates.`,
    ...certs.map((c: any) => {
      const days = c.expires_at ? Math.floor((new Date(c.expires_at).getTime() - now.getTime()) / 86400000) : null
      return `  - ${c.domain}: ${c.status}${days !== null ? `, expires in ${days} days` : ''}`
    }),
  ]
  if (orders.length > 0) {
    lines.push(`Recent orders:`)
    orders.forEach((o: any) => lines.push(`  - ${o.domain}: ${o.status} (GGS #${o.ggs_order_id || 'pending'})`))
  }
  return lines.join('\n')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json()
    const { question, messages = [], token } = body

    if (!question) return json({ error: 'question required' }, 400)

    // Build user context if authenticated
    let userCtx = ''
    if (token && token !== 'null') {
      try {
        const { data: { user } } = await createClient(SB_URL, Deno.env.get('SUPABASE_ANON_KEY') || '', {
          global: { headers: { Authorization: `Bearer ${token}` } }
        }).auth.getUser()
        if (user) userCtx = await getUserContext(user.id)
      } catch { /* not authenticated, continue as public */ }
    }

    const systemPrompt = `You are VaultBrain, the SSLVault AI assistant. You help users with SSL/TLS certificate management, PKI, DNS configuration, and the SSLVault platform.

SSLVault features: Certificate issuance via GoGetSSL (RapidSSL DV), auto-renewal with ACME, DNS auto-add for Cloudflare, KeyLocker encrypted private key vault, VPS agent for automated installation, vulnerability scanning, CAA checker, CA Trust Explorer, CAB Forum newsroom, Global PKI Hub.

Key facts:
- Certificates use GoGetSSL as CA (RapidSSL product, DigiCert trust chain)
- DV certificates validated via DNS TXT record
- Auto-renewal triggers 14 days before expiry
- KeyLocker uses AES-256-GCM envelope encryption — private keys never leave encrypted storage
- 47-day cert validity mandate: SC081v3 requires 200-day max by March 2026, 90-day by March 2027, 47-day by March 2029
- CAB Forum ballot SC081v3 is the key compliance deadline

${userCtx ? `\nLIVE USER ACCOUNT DATA:\n${userCtx}` : 'User is not authenticated — provide general SSLVault guidance.'}

Be concise, accurate, and helpful. If asked about a specific cert or domain in the user's account, reference the live data above.`

    if (!ANTHROPIC_API_KEY) return json({ ok: false, error: 'AI service not configured' }, 503)

    const hist = (messages as any[]).slice(-8).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [...hist, { role: 'user', content: question }],
      }),
    })
    const data = await res.json()
    const answer = data.content?.[0]?.text || data.error?.message || 'Unable to respond right now.'
    return json({ ok: true, answer })
  } catch (e: any) {
    return json({ ok: false, error: e.message }, 500)
  }
})
