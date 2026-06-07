// api/tls-scan.js — SSLVault live TLS certificate probe (Vercel Node runtime)
//
// Replaces the Cloudflare Worker as the quick-scan engine for ssl-monitor.
// Node's tls module reads the ACTUAL deployed certificate from the live
// handshake — leaf, chain, expiry, SANs, protocol, cipher — in <1 second.
// (Supabase Deno edge functions and Cloudflare Workers cannot expose the
// peer certificate; Node can.)
//
// POST { domain } → JSON matching the shape ssl-monitor's certCheck() expects:
//   { alive, valid, daysLeft, issuer, certStart, certExpiry, sans, source, ... }

import tls from 'node:tls'

const TIMEOUT_MS = 8000

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req, res) {
  for (const [k, v] of Object.entries(cors)) res.setHeader(k, v)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const domain = String(req.body?.domain || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^\*\./, '')
    .trim()
    .toLowerCase()

  if (!domain || !domain.includes('.') || !/^[a-z0-9.-]+$/.test(domain)) {
    return res.status(400).json({ error: 'Valid domain required' })
  }

  try {
    const result = await probe(domain)
    return res.status(200).json(result)
  } catch (e) {
    // Handshake failed entirely — host down, port closed, DNS failure, timeout
    return res.status(200).json({
      alive: false, valid: null, daysLeft: null, issuer: null,
      certStart: null, certExpiry: null, sans: [],
      source: 'vercel-tls', error: e.message || 'connection failed',
    })
  }
}

function probe(domain) {
  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (err) => { if (!settled) { settled = true; reject(err) } }
    const done = (val) => { if (!settled) { settled = true; resolve(val) } }

    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,        // SNI — required for shared hosting
        rejectUnauthorized: false, // we want the cert even when it's invalid
        timeout: TIMEOUT_MS,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true)
          const authorized = socket.authorized
          const authError = authorized ? null : (socket.authorizationError || null)
          const protocol = socket.getProtocol()
          const cipher = socket.getCipher()
          socket.end()

          if (!cert || !cert.valid_to) {
            return done({
              alive: true, valid: false, daysLeft: null, issuer: null,
              certStart: null, certExpiry: null, sans: [],
              source: 'vercel-tls', error: 'no certificate presented',
            })
          }

          const notBefore = new Date(cert.valid_from)
          const notAfter = new Date(cert.valid_to)
          const daysLeft = Math.floor((notAfter.getTime() - Date.now()) / 86400000)

          const sans = (cert.subjectaltname || '')
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.startsWith('DNS:'))
            .map((s) => s.slice(4))

          // Walk the served chain (issuerCertificate self-references at the root)
          const chain = []
          let c = cert.issuerCertificate
          let guard = 0
          let prevFp = cert.fingerprint256
          while (c && c.fingerprint256 && c.fingerprint256 !== prevFp && guard < 6) {
            chain.push({
              subject: c.subject?.CN || c.subject?.O || null,
              issuer: c.issuer?.CN || c.issuer?.O || null,
              expiry: c.valid_to || null,
            })
            prevFp = c.fingerprint256
            c = c.issuerCertificate
            guard++
          }

          done({
            alive: true,
            valid: authorized && daysLeft > 0,
            daysLeft,
            issuer: cert.issuer?.O || cert.issuer?.CN || null,
            issuerCN: cert.issuer?.CN || null,
            subject: cert.subject?.CN || null,
            certStart: isNaN(notBefore.getTime()) ? null : notBefore.toISOString(),
            certExpiry: isNaN(notAfter.getTime()) ? null : notAfter.toISOString(),
            sans,
            serial: cert.serialNumber || null,
            fingerprint256: cert.fingerprint256 || null,
            protocol: protocol || null,
            cipher: cipher?.name || null,
            chain,
            authError,
            source: 'vercel-tls',
            error: null,
          })
        } catch (e) {
          socket.destroy()
          fail(e)
        }
      },
    )

    socket.on('timeout', () => { socket.destroy(); fail(new Error('timeout after ' + TIMEOUT_MS + 'ms')) })
    socket.on('error', (err) => fail(err))
  })
}
