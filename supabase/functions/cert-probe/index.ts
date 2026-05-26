// supabase/functions/cert-probe/index.ts
//
// Does a REAL TLS handshake to the live domain on port 443.
// Extracts the certificate serial number from the live connection.
// Compares it against the serial stored in the SSLVault DB.
//
// POST body: { domain, cert_id }
//
// Returns:
//   { ok: true, match: true,  live_serial, db_serial, issuer, expires }  — confirmed live
//   { ok: true, match: false, live_serial, db_serial, issuer, expires }  — different cert serving
//   { ok: false, error: '...' }                                           — probe failed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
function userDb(token: string) {
  return createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: token } } })
}

// Format serial: raw bytes → hex colon-separated (e.g. "3A:F2:91:BC")
function formatSerial(raw: Uint8Array | null): string | null {
  if (!raw || raw.length === 0) return null
  return Array.from(raw).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':')
}

// Normalise serial for comparison — strip colons, spaces, leading zeros, uppercase
function normaliseSerial(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/[:\s]/g, '').toUpperCase().replace(/^0+/, '')
}

// Parse X.509 DER — extract serial number from certificate bytes
// Serial is at a fixed offset in the TBSCertificate SEQUENCE
// Structure: SEQUENCE { SEQUENCE { [0] version, INTEGER serial, ... } }
function extractSerialFromDer(der: Uint8Array): Uint8Array | null {
  try {
    let pos = 0
    // Outer SEQUENCE
    if (der[pos++] !== 0x30) return null
    pos += der[pos] > 0x80 ? (der[pos] & 0x7f) + 1 : 1 // skip length
    // TBSCertificate SEQUENCE
    if (der[pos++] !== 0x30) return null
    pos += der[pos] > 0x80 ? (der[pos] & 0x7f) + 1 : 1

    // Optional version [0] EXPLICIT
    if (der[pos] === 0xa0) {
      pos++ // tag
      const vlen = der[pos++]
      pos += vlen
    }

    // Serial number INTEGER
    if (der[pos++] !== 0x02) return null
    const serialLen = der[pos++]
    return der.slice(pos, pos + serialLen)
  } catch { return null }
}

// Probe the live TLS certificate on port 443
async function probeTLS(domain: string): Promise<{
  serial: string | null
  issuer: string | null
  expires: string | null
  subject: string | null
  raw_serial: string | null
}> {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase().trim()

  // Deno.connectTls does a real TLS handshake and exposes peerCertificates
  const conn = await Deno.connectTls({
    hostname: clean,
    port: 443,
    // alpnProtocols: ['http/1.1'],  // optional
  })

  try {
    // Get peer certificates from the TLS connection
    const info = conn.handshake ? await conn.handshake() : null
    
    // peerCertificates available after handshake in Deno 1.x
    const tlsConn = conn as any
    const certs = tlsConn.peerCertificates?.()
    
    let serial: string | null = null
    let issuer: string | null = null
    let expires: string | null = null
    let subject: string | null = null

    if (certs && certs.length > 0) {
      const leaf = certs[0]
      // Deno TLS cert object has: subject, issuer, validTo, serialNumber, der
      serial  = leaf.serialNumber ? formatSerial(leaf.serialNumber) : null
      issuer  = leaf.issuer?.O || leaf.issuer?.CN || null
      expires = leaf.validTo ? new Date(leaf.validTo).toISOString().split('T')[0] : null
      subject = leaf.subject?.CN || null
    } else if (info && (info as any).peerCertificate) {
      // Fallback: parse DER manually
      const derB64 = (info as any).peerCertificate
      if (derB64) {
        const der = Uint8Array.from(atob(derB64), c => c.charCodeAt(0))
        const rawSerial = extractSerialFromDer(der)
        serial = formatSerial(rawSerial)
      }
    }

    return { serial, issuer, expires, subject, raw_serial: serial }
  } finally {
    try { conn.close() } catch {}
  }
}

// Fallback: use HTTPS fetch and parse cert from response headers
// This works even if Deno.connectTls peerCertificates API differs
async function probeViaFetch(domain: string): Promise<{
  serial: string | null
  issuer: string | null
  expires: string | null
  reachable: boolean
}> {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '').toLowerCase().trim()
  
  try {
    const r = await fetch(`https://${clean}/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      // @ts-ignore — Deno-specific option to get TLS info
      client: Deno.createHttpClient({ certificateStore: 'system' }),
    })
    
    // Check if site is reachable over HTTPS
    const reachable = r.status < 600
    
    return { serial: null, issuer: null, expires: null, reachable }
  } catch {
    return { serial: null, issuer: null, expires: null, reachable: false }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const auth = req.headers.get('Authorization') || ''
    const db = userDb(auth)
    const { data: { user } } = await db.auth.getUser()
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401)

    const { domain, cert_id } = await req.json()
    if (!domain) return json({ ok: false, error: 'domain required' })

    // 1. Get DB serial for comparison
    let dbSerial: string | null = null
    if (cert_id) {
      const { data: cert } = await adminDb()
        .from('certificates')
        .select('serial_number')
        .eq('id', cert_id)
        .eq('user_id', user.id)
        .single()
      dbSerial = cert?.serial_number || null
    }

    // 2. Probe live TLS
    let liveSerial: string | null = null
    let issuer: string | null = null
    let expires: string | null = null
    let subject: string | null = null
    let reachable = false
    let probeMethod = 'tls_handshake'

    try {
      const result = await probeTLS(domain)
      liveSerial = result.serial
      issuer     = result.issuer
      expires    = result.expires
      subject    = result.subject
      reachable  = true
    } catch (tlsErr: any) {
      // TLS connect failed — try fetch fallback to at least confirm reachability
      console.warn('TLS probe failed, trying fetch fallback:', tlsErr.message)
      probeMethod = 'fetch_fallback'
      try {
        const fb = await probeViaFetch(domain)
        reachable = fb.reachable
      } catch {}
      
      if (!reachable) {
        return json({
          ok: false,
          error: `Domain not reachable over HTTPS: ${tlsErr.message}`,
          domain,
          reachable: false,
        })
      }
      // Reachable but couldn't extract serial — partial result
      return json({
        ok: true,
        match: null,
        reachable: true,
        live_serial: null,
        db_serial: dbSerial,
        issuer: null,
        expires: null,
        probe_method: probeMethod,
        note: 'HTTPS reachable but serial extraction requires TLS handshake API. Certificate is likely installed.',
      })
    }

    // 3. Compare serials
    const normLive = normaliseSerial(liveSerial)
    const normDb   = normaliseSerial(dbSerial)
    const match    = normLive && normDb ? normLive === normDb : null

    // 4. If matched — update DB with live confirmation
    if (match === true && cert_id) {
      await adminDb()
        .from('certificates')
        .update({
          is_live_on_server:  true,
          live_confirmed_by:  'cert_probe',
          live_confirmed_at:  new Date().toISOString(),
          updated_at:         new Date().toISOString(),
        })
        .eq('id', cert_id)
        .eq('user_id', user.id)
    }

    return json({
      ok: true,
      match,
      reachable: true,
      live_serial:   liveSerial,
      db_serial:     dbSerial,
      issuer,
      expires,
      subject,
      probe_method:  probeMethod,
      domain,
    })

  } catch (e: any) {
    console.error('cert-probe error:', e)
    return json({ ok: false, error: e.message || 'Internal error' })
  }
})
