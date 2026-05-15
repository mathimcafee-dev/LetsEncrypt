import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GGS_API = 'https://my.gogetssl.com/api'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function adminDb() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ── Read credentials from vault via SQL ───────────────────────────────
async function getCredentials(): Promise<{ user: string; pass: string }> {
  const db = adminDb()
  const { data, error } = await db.rpc('get_ggs_credentials')
  if (error || !data) throw new Error('Failed to read GGS credentials')
  return data
}

// ── GoGetSSL auth ─────────────────────────────────────────────────────
async function ggsAuth(): Promise<string> {
  const { user, pass } = await getCredentials()
  const res = await fetch(`${GGS_API}/auth/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ user, pass }),
  })
  const data = await res.json()
  if (!data.key) throw new Error(`GoGetSSL auth failed: ${JSON.stringify(data)}`)
  return data.key
}

async function ggsPost(authKey: string, path: string, body: Record<string, string>) {
  const res = await fetch(`${GGS_API}${path}?auth_key=${authKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  return res.json()
}

async function ggsGet(authKey: string, path: string) {
  const res = await fetch(`${GGS_API}${path}?auth_key=${authKey}`)
  return res.json()
}

// ── Product catalogue ─────────────────────────────────────────────────
const PRODUCT_META: Record<string, { wildcard: boolean }> = {
  rapidssl:          { wildcard: false },
  rapidssl_wildcard: { wildcard: true  },
}

async function resolveProductId(authKey: string, code: string): Promise<{ id: number; name: string }> {
  const resp = await ggsGet(authKey, '/products/ssl/')
  // Response is an object keyed by product_id
  const entries = typeof resp === 'object' && !Array.isArray(resp)
    ? Object.entries(resp).map(([id, p]: [string, any]) => ({ id: Number(id), ...p }))
    : (resp as any[])

  const isWildcard = PRODUCT_META[code]?.wildcard ?? false
  const match = entries.find((p: any) => {
    const name: string = (p.name || '').toLowerCase()
    return name.includes('rapidssl') && (isWildcard ? name.includes('wildcard') : !name.includes('wildcard'))
  })

  if (!match) {
    const names = entries.map((p: any) => p.name).join(', ')
    throw new Error(`Product '${code}' not found. Available: ${names}`)
  }
  return { id: Number(match.id || match.product_id), name: match.name }
}

// ── Main handler ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action } = body

    // ── place_order ───────────────────────────────────────────────────
    if (action === 'place_order') {
      const { domain, period = 12, product_code = 'rapidssl',
              firstName, lastName, adminEmail, phone } = body

      if (!domain)    return json({ error: 'domain required' }, 400)
      if (!firstName || !lastName || !adminEmail || !phone)
        return json({ error: 'Contact details required' }, 400)

      const authKey = await ggsAuth()
      const product = await resolveProductId(authKey, product_code)

      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
      const csrDomain   = PRODUCT_META[product_code]?.wildcard
        ? (cleanDomain.startsWith('*.') ? cleanDomain : `*.${cleanDomain}`)
        : cleanDomain

      // Generate CSR server-side
      const csrRes = await ggsPost(authKey, '/tools/csr/generate/', {
        domain:     csrDomain,
        country:    'NL',
        state:      'Noord-Holland',
        city:       'Amsterdam',
        org:        'SSLVault',
        department: 'IT',
        email:      adminEmail,
      })
      if (!csrRes.csr_code)
        return json({ error: `CSR generation failed: ${JSON.stringify(csrRes)}` }, 500)

      // Place order with DNS TXT DCV (RapidSSL only supports dns_txt)
      const orderRes = await ggsPost(authKey, '/orders/add_ssl_order/', {
        product_id:       String(product.id),
        period:           String(period),
        csr:              csrRes.csr_code,
        server_count:     '-1',
        dcv_method:       'dns_txt',
        approver_email:   `admin@${cleanDomain}`,
        admin_email:      adminEmail,
        admin_phone:      phone,
        admin_first_name: firstName,
        admin_last_name:  lastName,
        tech_email:       adminEmail,
        tech_phone:       phone,
        tech_first_name:  firstName,
        tech_last_name:   lastName,
      })

      if (!orderRes.order_id)
        return json({ error: orderRes.description || orderRes.error || JSON.stringify(orderRes) }, 500)

      // Save order to DB
      const { data: saved, error: dbErr } = await adminDb()
        .from('ssl_orders')
        .insert({
          user_id:          user.id,
          domain:           cleanDomain,
          product_id:       product.id,
          product_name:     product.name,
          product_code,
          period,
          status:           'dv_pending',
          ggs_order_id:     orderRes.order_id,
          ggs_invoice_id:   orderRes.invoice_id,
          csr_code:         csrRes.csr_code,
          admin_email:      adminEmail,
          admin_first_name: firstName,
          admin_last_name:  lastName,
          admin_phone:      phone,
        })
        .select()
        .single()

      if (dbErr) return json({ error: dbErr.message }, 500)

      // Poll once immediately for DCV info
      await new Promise(r => setTimeout(r, 2000))
      const statusRes = await ggsGet(authKey, `/orders/status/${orderRes.order_id}`)

      let dcvName = '', dcvValue = ''
      if (statusRes.domains) {
        const d = Object.values(statusRes.domains)[0] as any
        // GoGetSSL returns dns_txt tokens under txt_name/txt_value
        dcvName  = d?.txt_name   || d?.validation?.txt_name   ||
                   d?.cname_name || d?.validation?.cname_name  || ''
        dcvValue = d?.txt_value  || d?.validation?.txt_value  ||
                   d?.cname_value|| d?.validation?.cname_value || ''
      }

      if (dcvName || dcvValue) {
        await adminDb().from('ssl_orders').update({
          dcv_cname_name:  dcvName,
          dcv_cname_value: dcvValue,
          ggs_status:      statusRes.status,
          updated_at:      new Date().toISOString(),
        }).eq('id', saved.id)
      }

      return json({
        ok:              true,
        order_id:        saved.id,
        ggs_order_id:    orderRes.order_id,
        domain:          cleanDomain,
        product_name:    product.name,
        dcv_txt_name:    dcvName,
        dcv_txt_value:   dcvValue,
        status:          'dv_pending',
      })
    }

    // ── check_status ──────────────────────────────────────────────────
    if (action === 'check_status') {
      const { order_id } = body

      const { data: order } = await adminDb()
        .from('ssl_orders')
        .select('*')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .single()

      if (!order) return json({ error: 'Order not found' }, 404)

      const authKey   = await ggsAuth()
      const statusRes = await ggsGet(authKey, `/orders/status/${order.ggs_order_id}`)

      const upd: Record<string, any> = {
        ggs_status: statusRes.status,
        updated_at: new Date().toISOString(),
      }

      // Pick up DCV info if missing
      if (!order.dcv_cname_value && statusRes.domains) {
        const d = Object.values(statusRes.domains)[0] as any
        upd.dcv_cname_name  = d?.txt_name   || d?.validation?.txt_name   ||
                               d?.cname_name || d?.validation?.cname_name  || ''
        upd.dcv_cname_value = d?.txt_value  || d?.validation?.txt_value  ||
                               d?.cname_value|| d?.validation?.cname_value || ''
      }

      // Certificate active
      if (statusRes.status === 'active' && statusRes.crt_code) {
        upd.status    = 'active'
        upd.crt_code  = statusRes.crt_code
        upd.ca_code   = statusRes.ca_code
        upd.valid_from = statusRes.valid_from
        upd.valid_till = statusRes.valid_till

        // Mirror to certificates table for dashboard
        await adminDb().from('certificates').upsert({
          user_id:    user.id,
          domain:     order.domain,
          status:     'active',
          cert_pem:   statusRes.crt_code,
          ca_pem:     statusRes.ca_code,
          expires_at: statusRes.valid_till,
          issuer:     order.product_name,
          source:     'gogetssl',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,domain' })
      }

      await adminDb().from('ssl_orders').update(upd).eq('id', order_id)

      return json({
        ok:              true,
        status:          upd.status || order.status,
        ggs_status:      statusRes.status,
        dcv_txt_name:    upd.dcv_cname_name  || order.dcv_cname_name,
        dcv_txt_value:   upd.dcv_cname_value || order.dcv_cname_value,
        crt_code:        statusRes.crt_code,
        ca_code:         statusRes.ca_code,
        valid_till:      statusRes.valid_till,
      })
    }

    // ── get_products ──────────────────────────────────────────────────
    if (action === 'get_products') {
      const authKey = await ggsAuth()
      const resp    = await ggsGet(authKey, '/products/ssl/')
      const entries = typeof resp === 'object' && !Array.isArray(resp)
        ? Object.entries(resp).map(([id, p]: [string, any]) => ({ id: Number(id), ...p }))
        : (resp as any[])
      const rapid = entries.filter((p: any) => (p.name||'').toLowerCase().includes('rapidssl'))
      return json({ ok: true, products: rapid })
    }

    return json({ error: `Unknown action: ${action}` }, 400)

  } catch (e: any) {
    console.error('gogetssl-issue:', e)
    return json({ error: e.message || 'Internal error' }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
