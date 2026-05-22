import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

async function getCTHistory(domain: string) {
  try {
    const r = await fetch(
      `https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json&deduplicate=Y`,
      { signal: AbortSignal.timeout(12000) }
    )
    if (!r.ok) return null
    const certs = await r.json()
    if (!Array.isArray(certs) || certs.length === 0) return { count: 0, firstSeen: null, daysSince: 0, yearsSince: 0, issuers: [], recentExpiry: null }
    const dates = certs.map((c: any) => new Date(c.not_before).getTime()).filter((d: number) => !isNaN(d)).sort((a: number, b: number) => a - b)
    const firstSeen = dates.length > 0 ? new Date(dates[0]) : null
    const daysSince = firstSeen ? Math.floor((Date.now() - firstSeen.getTime()) / 86400000) : 0
    const issuers = [...new Set(certs.map((c: any) => {
      const i = c.issuer_name || ''
      if (i.includes("Let's Encrypt") || i.includes("Let\\u2019s Encrypt")) return "Let's Encrypt"
      if (i.includes('DigiCert')) return 'DigiCert'
      if (i.includes('Sectigo') || i.includes('Comodo')) return 'Sectigo'
      if (i.includes('GlobalSign')) return 'GlobalSign'
      if (i.includes('ZeroSSL')) return 'ZeroSSL'
      if (i.includes('Google')) return 'Google Trust Services'
      return 'Other'
    }))]
    const recent = certs.sort((a: any, b: any) => new Date(b.not_before).getTime() - new Date(a.not_before).getTime())[0]
    return { count: certs.length, firstSeen: firstSeen?.toISOString().split('T')[0] ?? null, daysSince, yearsSince: Math.floor(daysSince / 365), issuers, recentExpiry: recent?.not_after ?? null }
  } catch { return null }
}

async function getDomainAge(domain: string) {
  const root = domain.split('.').slice(-2).join('.')
  try {
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(root)}`, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const data = await r.json()
    const reg = (data.events || []).find((e: any) => e.eventAction === 'registration')
    if (!reg?.eventDate) return null
    const regDate = new Date(reg.eventDate)
    const ageDays = Math.floor((Date.now() - regDate.getTime()) / 86400000)
    return { registeredDate: regDate.toISOString().split('T')[0], ageDays, ageYears: Math.floor(ageDays / 365) }
  } catch { return null }
}

async function getDNSSignals(domain: string) {
  const doh = async (type: string) => {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) })
      return (await r.json()).Answer || []
    } catch { return [] }
  }
  const [mx, caa, txt] = await Promise.all([doh('MX'), doh('CAA'), doh('TXT')])
  const hasSPF = txt.some((t: any) => (t.data || '').includes('v=spf1'))
  const hasDMARC = txt.some((t: any) => (t.data || '').includes('v=DMARC1'))
  let hasHTTPS = false
  try {
    const hr = await fetch(`https://${domain}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(6000) })
    hasHTTPS = hr.status < 500
  } catch { hasHTTPS = false }
  return { hasMX: mx.length > 0, hasCAA: caa.length > 0, hasSPF, hasDMARC, hasHTTPS }
}

async function getAbuseSignals(domain: string) {
  let flagged = false
  let flagReason = ''
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain + '.dbl.spamhaus.org')}&type=A`, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(3000) })
    const d = await r.json()
    if (d.Answer?.length > 0 && !d.Answer[0].data?.startsWith('127.255')) {
      flagged = true; flagReason = 'Listed in Spamhaus Domain Block List'
    }
  } catch { /* continue */ }
  return { flagged, flagReason }
}

function computeScore(ct: any, domainAge: any, dns: any, abuse: any) {
  if (abuse?.flagged) return { total: 0, grade: 'F', verdict: 'blocked', layers: { ct_lineage: 0, domain_age: 0, dns_infrastructure: 0, abuse_signals: 0 } }
  const layers: Record<string, number> = {}
  // CT Lineage 0-40
  if (!ct || ct.count === 0) { layers.ct_lineage = 0 } else {
    const yrs = Math.min((ct.yearsSince || 0) * 5, 30)
    const cnt = ct.count >= 5 ? 5 : ct.count >= 2 ? 3 : 1
    const iss = (ct.issuers?.length || 0) <= 3 ? 5 : 3
    layers.ct_lineage = Math.min(yrs + cnt + iss, 40)
  }
  // Domain age 0-25
  const days = domainAge?.ageDays || ct?.daysSince || 0
  layers.domain_age = days < 30 ? 0 : days < 180 ? 5 : days < 365 ? 10 : days < 730 ? 15 : days < 1825 ? 20 : 25
  // DNS infra 0-20
  let d = 0
  if (dns?.hasHTTPS) d += 6; if (dns?.hasMX) d += 5; if (dns?.hasSPF) d += 3; if (dns?.hasDMARC) d += 4; if (dns?.hasCAA) d += 2
  layers.dns_infrastructure = Math.min(d, 20)
  // Abuse 0-15
  layers.abuse_signals = abuse?.flagged ? 0 : 15
  const total = Object.values(layers).reduce((a, b) => a + b, 0)
  const grade = total >= 85 ? 'A+' : total >= 70 ? 'A' : total >= 55 ? 'B' : total >= 35 ? 'C' : total >= 15 ? 'D' : 'F'
  const verdict = total >= 70 ? 'trusted' : total >= 40 ? 'caution' : total >= 15 ? 'new' : 'suspicious'
  return { total, grade, verdict, layers }
}

function getBehaviourProfile(ct: any, dns: any) {
  if (!ct || ct.count === 0) return { profile: 'no_history', label: 'No certificate history found', risk: 'high' }
  const days = ct.daysSince || 0; const hasMail = dns?.hasMX && dns?.hasSPF
  if (days > 1825 && hasMail && ct.count > 5) return { profile: 'established_business', label: 'Established site with full email infrastructure', risk: 'low' }
  if (days > 730 && ct.count > 3) return { profile: 'established', label: 'Well-established with consistent renewal history', risk: 'low' }
  if (days > 365) return { profile: 'maturing', label: 'Over 1 year of verified certificate history', risk: 'low' }
  if (days > 90) return { profile: 'new_but_active', label: 'Relatively new site with active certificates', risk: 'medium' }
  if (days > 30) return { profile: 'very_new', label: 'Site is less than 90 days old', risk: 'medium' }
  return { profile: 'brand_new', label: 'Certificate issued within the last 30 days — no prior history', risk: 'high' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { domain: raw } = await req.json()
    const domain = raw?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    if (!domain || !domain.includes('.')) return new Response(JSON.stringify({ error: 'Invalid domain' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    const [ct, domainAge, dns, abuse] = await Promise.all([getCTHistory(domain), getDomainAge(domain), getDNSSignals(domain), getAbuseSignals(domain)])
    const score = computeScore(ct, domainAge, dns, abuse)
    const behaviour = getBehaviourProfile(ct, dns)
    const summary = score.verdict === 'trusted' ? `${domain} has a strong trust standing with ${ct?.yearsSince || 0}+ years of verified certificate history and clean infrastructure signals.`
      : score.verdict === 'caution' ? `${domain} has some positive signals but limited history. Verified, but proceed thoughtfully.`
      : score.verdict === 'new' ? `${domain} has very little history. This site may be legitimate but lacks the time-based trust signals of established sites.`
      : `${domain} has characteristics associated with suspicious or newly-created sites.`
    return new Response(JSON.stringify({ ok: true, domain, score: score.total, grade: score.grade, verdict: score.verdict, summary, behaviour, layers: { ct_lineage: { score: score.layers.ct_lineage, max: 40, data: ct }, domain_age: { score: score.layers.domain_age, max: 25, data: domainAge }, dns_infrastructure: { score: score.layers.dns_infrastructure, max: 20, data: dns }, abuse_signals: { score: score.layers.abuse_signals, max: 15, data: abuse } }, computed_at: new Date().toISOString() }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
