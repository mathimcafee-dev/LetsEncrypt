import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// Known GoGetSSL / Sectigo CAA entries that allow issuance
const ALLOWED_CAA = ['sectigo.com', 'trust-provider.com', 'usertrust.com', 'comodoca.com']

async function lookupCAA(domain: string): Promise<string[]> {
  // Use Cloudflare DNS-over-HTTPS — no native DNS in Deno edge
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CAA`,
    { headers: { Accept: 'application/dns-json' } }
  )
  const data = await res.json()
  if (!data.Answer) return []
  // CAA rdata format: "0 issue \"sectigo.com\""
  return (data.Answer as Array<{ data: string }>).map(a => a.data)
}

function parseCAA(records: string[]) {
  const issue:      string[] = []
  const issuewild:  string[] = []
  const iodef:      string[] = []
  for (const r of records) {
    const m = r.match(/^\d+\s+(issue|issuewild|iodef)\s+"([^"]*)"/)
    if (!m) continue
    if (m[1] === 'issue')     issue.push(m[2])
    if (m[1] === 'issuewild') issuewild.push(m[2])
    if (m[1] === 'iodef')     iodef.push(m[2])
  }
  return { issue, issuewild, iodef }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { domain } = await req.json()
    if (!domain) return new Response(JSON.stringify({ ok: false, error: 'domain required' }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

    const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim().toLowerCase()

    // Try domain, then parent domain (for subdomains)
    let records = await lookupCAA(clean)
    let checkedDomain = clean
    if (records.length === 0 && clean.split('.').length > 2) {
      const parent = clean.split('.').slice(1).join('.')
      records = await lookupCAA(parent)
      checkedDomain = parent
    }

    const hasRecords = records.length > 0
    const parsed = parseCAA(records)

    // If no CAA records at all — ANY CA can issue (permissive, not an error)
    const goGetSslAllowed = !hasRecords || parsed.issue.some(v => ALLOWED_CAA.some(a => v === a || v === ''))
    const wildcardAllowed = !hasRecords || parsed.issuewild.some(v => ALLOWED_CAA.some(a => v === a || v === ''))

    const checks = [
      {
        key: 'caa_found',
        label: hasRecords ? 'CAA record found' : 'No CAA records (all CAs permitted)',
        status: hasRecords ? 'pass' : 'info',
        detail: hasRecords ? `Found on ${checkedDomain}` : 'Any CA may issue — consider adding CAA for security',
      },
      {
        key: 'gogetssl_allowed',
        label: 'GoGetSSL / Sectigo authorized',
        status: goGetSslAllowed ? 'pass' : 'fail',
        detail: goGetSslAllowed
          ? (hasRecords ? `issue: ${parsed.issue.join(', ')}` : 'No restrictions — issuance allowed')
          : `Blocked. Add: 0 issue "sectigo.com"`,
        raw: hasRecords ? `0 issue "sectigo.com"` : null,
      },
      {
        key: 'wildcard',
        label: 'Wildcard issuance (issuewild)',
        status: wildcardAllowed ? (parsed.issuewild.length > 0 ? 'pass' : 'info') : 'fail',
        detail: parsed.issuewild.length > 0
          ? `issuewild: ${parsed.issuewild.join(', ')}`
          : (wildcardAllowed ? `Not set — add 0 issuewild "sectigo.com" for *.${clean}` : 'Blocked for wildcard'),
        raw: parsed.issuewild.length === 0 ? `0 issuewild "sectigo.com"` : null,
      },
      {
        key: 'iodef',
        label: 'Violation reporting (iodef)',
        status: parsed.iodef.length > 0 ? 'pass' : 'info',
        detail: parsed.iodef.length > 0 ? `iodef: ${parsed.iodef.join(', ')}` : 'Optional — reports misissuance attempts to you',
      },
    ]

    const safeToIssue = goGetSslAllowed
    const summary = safeToIssue
      ? (hasRecords ? 'Safe to issue — GoGetSSL is authorized' : 'Safe to issue — no CAA restrictions')
      : 'Cannot issue — GoGetSSL is blocked by CAA policy'

    return new Response(JSON.stringify({
      ok: true,
      domain: clean,
      checkedDomain,
      hasRecords,
      safeToIssue,
      summary,
      checks,
      rawRecords: records,
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
