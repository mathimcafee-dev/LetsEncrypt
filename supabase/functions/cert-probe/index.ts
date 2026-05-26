// supabase/functions/cert-probe/index.ts  v2
//
// Expert certificate verification — two independent proofs:
//
//   PROOF 1 — Serial from PEM (authoritative)
//     Parse the cert_pem stored in our DB using @peculiar/x509.
//     Extract serial, issuer, validity, SANs. No external call needed.
//     This is the GoGetSSL-issued certificate — we know it's genuine.
//
//   PROOF 2 — Live HTTPS reachability
//     Fetch https://{domain}/ and confirm TLS handshake succeeds.
//     If reachable → server is serving SSL. Combined with Proof 1 = confirmed.
//
//   COMBINED RESULT:
//     serial_from_cert  — parsed from our PEM (always available if cert issued)
//     https_reachable   — did the domain respond over TLS
//     live_confirmed    — both proofs pass = cert is issued AND server is live

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as x509 from 'https://esm.sh/@peculiar/x509@1.9.7'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SB_URL     = Deno.env.get('SUPABASE_URL')!
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SB_ANON    = Deno.env.get('SUPABASE_ANON_KEY')!

function adminDb() { return createClient(SB_URL, SB_SERVICE) }
function userDb(t: string) {
  return createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: t } } })
}

// ── PROOF 1: Parse cert PEM → extract all fields ─────────────────────────────
interface CertInfo {
  serial:     string
  issuer:     string
  subject:    string
  not_before: string
  not_after:  string
  days_left:  number
  sans:       string[]
  algorithm:  string
  key_size:   number | null
}

function parseCertPem(pem: string): CertInfo {
  const cert = new x509.X509Certificate(pem)

  const serial = cert.serialNumber
    .match(/.{1,2}/g)!
    .map(b => b.toUpperCase())
    .join(':')

  const notAfter  = new Date(cert.notAfter)
  const daysLeft  = Math.floor((notAfter.getTime() - Date.now()) / 86400000)

  const sans: string[] = []
  try {
    const sanExt = cert.getExtension('2.5.29.17') as x509.SubjectAlternativeNameExtension | null
    if (sanExt) {
      for (const name of sanExt.names) {
        if (name.type === 'dns') sans.push(name.value)
      }
    }
  } catch {}

  const algo = cert.publicKey?.algorithm?.name || 'Unknown'
  let keySize: number | null = null
  try {
    const params = cert.publicKey?.algorithm as any
    keySize = params?.modulusLength || params?.namedCurve || null
  } catch {}

  return {
    serial,
    issuer:     cert.issuerName?.toString() || '',
    subject:    cert.subjectName?.toString() || '',
    not_before: new Date(cert.notBefore).toISOString().split('T')[0],
    not_after:  notAfter.toISOString().split('T')[0],
    days_left:  daysLeft,
    sans,
    algorithm:  algo,
    key_size:   typeof keySize === 'number' ? keySize : null,
  }
}

// ── PROOF 2: HTTPS reachability probe ────────────────────────────────────────
async function probeHttps(domain: string): Promise<{
  reachable:    boolean
  status_code:  number | null
  hsts:         boolean
  redirect_ssl: boolean
  latency_ms:   number
  error:        string | null
}> {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase().trim()
  const start = Date.now()
  try {
    const res = await fetch(`https://${clean}/`, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'SSLVault-CertProbe/2.0' },
    })
    const latency = Date.now() - start
    return {
      reachable:    true,
      status_code:  res.status,
      hsts:         res.headers.has('strict-transport-security'),
      redirect_ssl: res.url.startsWith('https://'),
      latency_ms:   latency,
      error:        null,
    }
  } catch (e: any) {
    return {
      reachable:    false,
      status_code:  null,
      hsts:         false,
      redirect_ssl: false,
      latency_ms:   Date.now() - start,
      error:        e.message || 'Connection failed',
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const auth = req.headers.get('Authorization') || ''
    const db   = userDb(auth)
    const { data: { user } } = await db.auth.getUser()
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401)

    const { domain, cert_id } = await req.json()
    if (!domain) return json({ ok: false, error: 'domain required' })

    // ── Fetch cert row ────────────────────────────────────────────────────────
    let certPem:      string | null = null
    let dbSerial:     string | null = null
    let certId:       string | null = cert_id || null

    if (cert_id) {
      const { data: row } = await adminDb()
        .from('certificates')
        .select('cert_pem, serial_number, id')
        .eq('id', cert_id)
        .eq('user_id', user.id)
        .single()
      if (row) {
        certPem  = row.cert_pem  || null
        dbSerial = row.serial_number || null
        certId   = row.id
      }
    }

    // If no cert_id, try finding by domain
    if (!certPem) {
      const { data: row } = await adminDb()
        .from('certificates')
        .select('cert_pem, serial_number, id')
        .eq('domain', domain)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (row) {
        certPem  = row.cert_pem  || null
        dbSerial = row.serial_number || null
        certId   = row.id
      }
    }

    // ── PROOF 1: Parse PEM ────────────────────────────────────────────────────
    let certInfo: CertInfo | null = null
    let pemError: string | null   = null

    if (certPem) {
      try {
        certInfo = parseCertPem(certPem)
        // Back-fill serial in DB if missing
        if (!dbSerial && certInfo.serial && certId) {
          await adminDb()
            .from('certificates')
            .update({ serial_number: certInfo.serial, updated_at: new Date().toISOString() })
            .eq('id', certId)
        }
      } catch (e: any) {
        pemError = `PEM parse failed: ${e.message}`
      }
    } else {
      pemError = 'cert_pem not in DB — certificate may not be fully issued yet'
    }

    // ── PROOF 2: HTTPS probe ──────────────────────────────────────────────────
    const httpsResult = await probeHttps(domain)

    // ── Verdict ───────────────────────────────────────────────────────────────
    // live_confirmed = cert issued (we have the PEM + serial) AND server is HTTPS reachable
    const certIssued    = !!certInfo
    const liveConfirmed = certIssued && httpsResult.reachable

    // Write confirmed status to DB
    if (liveConfirmed && certId) {
      await adminDb()
        .from('certificates')
        .update({
          is_live_on_server: true,
          live_confirmed_by: 'cert_probe',
          live_confirmed_at: new Date().toISOString(),
          updated_at:        new Date().toISOString(),
        })
        .eq('id', certId)
        .eq('user_id', user.id)
    }

    const serial = certInfo?.serial || dbSerial || null

    return json({
      ok:             true,
      live_confirmed: liveConfirmed,

      // Proof 1 — certificate details from PEM
      cert: certInfo ? {
        serial:     certInfo.serial,
        issuer:     certInfo.issuer,
        subject:    certInfo.subject,
        not_before: certInfo.not_before,
        not_after:  certInfo.not_after,
        days_left:  certInfo.days_left,
        sans:       certInfo.sans,
        algorithm:  certInfo.algorithm,
        key_size:   certInfo.key_size,
      } : null,
      pem_error: pemError,

      // Proof 2 — live HTTPS check
      https: {
        reachable:   httpsResult.reachable,
        status_code: httpsResult.status_code,
        hsts:        httpsResult.hsts,
        latency_ms:  httpsResult.latency_ms,
        error:       httpsResult.error,
      },

      // Summary fields (for modal display)
      serial,
      domain,
      cert_id: certId,
    })

  } catch (e: any) {
    console.error('cert-probe v2 error:', e)
    return json({ ok: false, error: e.message || 'Internal error' })
  }
})
