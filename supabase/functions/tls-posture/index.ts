import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

function adminDb() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

const PQC_SAFE = ['ML-DSA', 'ML-KEM', 'SLH-DSA', 'CRYSTALS-Dilithium', 'CRYSTALS-Kyber', 'FALCON']
const DEPRECATED = ['RSA-1024', 'DSA', 'RC4', 'MD5', 'SHA1withRSA']

function assessAlgorithm(algo: string): { quantum_safe: boolean; deprecated: boolean; level: string } {
  const a = (algo || '').toUpperCase()
  const quantum_safe = PQC_SAFE.some(p => a.includes(p.toUpperCase()))
  const deprecated   = DEPRECATED.some(d => a.includes(d.toUpperCase()))
  const level = quantum_safe ? 'quantum_safe' : deprecated ? 'deprecated' : 'classical'
  return { quantum_safe, deprecated, level }
}

async function checkDomain(domain: string) {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase()
  const checks: Record<string, any> = { domain: clean }

  // TLS handshake info via crt.sh
  try {
    const r = await fetch(`https://crt.sh/?q=${encodeURIComponent(clean)}&output=json`, { signal: AbortSignal.timeout(8000) })
    const certs = await r.json()
    if (Array.isArray(certs) && certs.length > 0) {
      const latest = certs.sort((a: any, b: any) => new Date(b.not_before).getTime() - new Date(a.not_before).getTime())[0]
      const algo = latest.issuer_name || ''
      checks.cert_found = true
      checks.issuer = latest.issuer_name
      checks.not_after = latest.not_after
      checks.algorithm = algo.includes('RSA') ? 'RSA' : algo.includes('EC') ? 'ECDSA' : 'Unknown'
      checks.pqc = assessAlgorithm(checks.algorithm)
      checks.days_left = Math.floor((new Date(latest.not_after).getTime() - Date.now()) / 86400000)
      checks.sc081v3_200day = checks.days_left <= 200 ? 'pass' : 'action_needed'
      checks.sc081v3_90day  = checks.days_left <= 90  ? 'pass' : 'action_needed'
      checks.sc081v3_47day  = checks.days_left <= 47  ? 'pass' : 'action_needed'
    }
  } catch { checks.cert_found = false }

  // HSTS check
  try {
    const r = await fetch(`https://${clean}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5000) })
    checks.hsts = r.headers.has('strict-transport-security')
    checks.https_redirect = r.status < 400
  } catch { checks.hsts = false; checks.https_redirect = false }

  // CAA check
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${clean}&type=CAA`, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) })
    const d = await r.json()
    checks.caa = Array.isArray(d.Answer) && d.Answer.length > 0
  } catch { checks.caa = false }

  return checks
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const auth = req.headers.get('Authorization') || ''
    const db   = adminDb()

    // Auth check
    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') || auth.replace('Bearer ', ''),
      { global: { headers: { Authorization: auth } } }
    ).auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action, cert_id, domain } = body

    // Single domain check
    if (action === 'check') {
      if (!domain) return json({ error: 'domain required' }, 400)
      const checks = await checkDomain(domain)
      // Store result in DB
      if (cert_id) {
        await db.from('certificates').update({ tls_posture: checks, posture_checked_at: new Date().toISOString() }).eq('id', cert_id).eq('user_id', user.id)
      }
      return json({ ok: true, checks })
    }

    // Single cert PQC check
    if (action === 'pqc_check') {
      if (!cert_id) return json({ error: 'cert_id required' }, 400)
      const { data: cert } = await db.from('certificates').select('domain, algorithm').eq('id', cert_id).eq('user_id', user.id).single()
      if (!cert) return json({ error: 'Certificate not found' }, 404)
      const pqc = assessAlgorithm(cert.algorithm || 'RSA-2048')
      const checks = await checkDomain(cert.domain)
      await db.from('certificates').update({ pqc_status: pqc.level, tls_posture: checks }).eq('id', cert_id).eq('user_id', user.id)
      return json({ ok: true, pqc, checks, domain: cert.domain })
    }

    // All certs PQC check
    if (action === 'pqc_check_all') {
      const { data: certs } = await db.from('certificates').select('id, domain, algorithm').eq('user_id', user.id).eq('status', 'active').limit(50)
      const results = (certs || []).map((c: any) => ({
        id: c.id, domain: c.domain,
        pqc: assessAlgorithm(c.algorithm || 'RSA-2048'),
      }))
      const safe     = results.filter(r => r.pqc.quantum_safe).length
      const at_risk  = results.filter(r => !r.pqc.quantum_safe && !r.pqc.deprecated).length
      const critical = results.filter(r => r.pqc.deprecated).length
      return json({ ok: true, summary: { total: results.length, safe, at_risk, critical }, results })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
})
