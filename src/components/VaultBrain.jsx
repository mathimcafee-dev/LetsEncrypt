// VaultBrain.jsx — SSLVault AI Support Agent
// Zero external API. Zero cost. Built from your actual codebase.
// Drop into Nav.jsx as: import VaultBrain from './VaultBrain'
// Then add <VaultBrain /> anywhere inside the Nav return.

import { useState, useRef, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE — built from reading every line of your codebase
// ─────────────────────────────────────────────────────────────────────────────
const KB = {

  // ── Platform architecture ────────────────────────────────────────────────
  architecture: {
    stack: 'React + Vite frontend, Supabase Edge Functions, Vercel hosting (auto-deploy on push to main)',
    supabase_project: 'frthcwkntciaakqsppss',
    vercel_project: 'freeencryption / prj_RbtRZ3pm5TIz1nGFN9zsMNGXVdCB',
    production_urls: ['easysecurity.in', 'freeencryption.vercel.app'],
    github_repo: 'mathimcafee-dev/LetsEncrypt (main branch)',
    design_system: 'v2 — solid #0a0a0a background, #10b981 signature green, split list+detail layout, tokens in src/styles/design-v2.css',
  },

  // ── Routes ────────────────────────────────────────────────────────────────
  routes: {
    '/': 'Home (logged out) or CLMHome (logged in)',
    '/dashboard': 'Certificate dashboard — list + detail panel, stats, activity feed',
    '/certvault': 'CertVault/KeyLocker — encrypted key storage, rotation, audit log',
    '/buy': 'BuyCertificate — issue new SSL cert via RapidSSL/GoGetSSL',
    '/install': 'Install guide — VPS agent, cPanel, Nginx, Apache',
    '/integrations': 'Integrations page',
    '/knowledge-base': 'Documentation',
    '/dns-providers': 'DNS + Server credentials (DnsProviders.jsx)',
    '/auth': 'Sign in / set password (magic link → set password flow)',
    '/admin': 'AdminAnalytics',
    '/agent-health': 'AgentHealth page',
    '/cert-intelligence': 'CAIntelligenceHub',
    '/ca-connectors': 'CAConnectors',
    '/scan': 'BulkScanner',
    '/status': 'PublicStatus page',
    '/certbind': 'CertBind — verify key/cert binding',
    '/pricing': 'Pricing page',
  },

  // ── Edge Functions ────────────────────────────────────────────────────────
  edge_functions: {
    'auto-renew-cron': 'Handles auto-renewal of certificates approaching expiry. Checks certs, triggers reissuance, dispatches agent jobs.',
    'gogetssl-issue': 'Issues certificates via GoGetSSL/RapidSSL API. Handles DV validation, DNS-01 challenge, cert delivery.',
    'keylocker': 'CertVault key operations — list, fetch (decrypt), archive. AES-256-GCM encrypted key storage.',
    'send-renewal-email': 'Sends expiry alert emails via Resend. Uses threshold stored in user settings.',
    'rapidssl-issue': 'Issues and manages RapidSSL certificates — check_status, get_history, reissue, renew actions.',
    'tls-posture': 'TLS posture check — grades domain A-F on HTTPS, HSTS, security headers, cert validity. Also PQC risk assessment.',
    'dns-provider': 'DNS provider credential management and DNS-01 challenge automation. Supports Cloudflare, Vercel, GoDaddy, DigitalOcean.',
    'server-credentials': 'Server credential management — save, list, update, delete for cPanel/SSH/Plesk servers.',
    'agent-daemon': 'Persistent VPS agent coordination — create_install_command, list_agents, dispatch jobs, deregister.',
    'certvault': 'Alias for keylocker edge function for key vault operations.',
  },

  // ── Database tables ───────────────────────────────────────────────────────
  tables: {
    'certificates': 'Main cert table — domain, user_id, status (active/revoked), expires_at, issued_at, cert_pem, private_key_pem, ggs_order_id, dcv_method, pqc_risk, tls_grade, tls_score, key_algorithm, certvault_key_id',
    'ssl_orders': 'Order records from GoGetSSL — ggs_order_id, status (active/dv_pending), product_name, period, admin_*, tech_*, dcv_txt_name, dcv_txt_value',
    'cert_reissues': 'Reissue history — cert_id, reissue_number, status, triggered_by, install_status, cert_pem',
    'profiles': 'User profiles — plan (free/pro/team), plan_expires_at, stripe_customer_id, seats_total',
    'dns_credentials': 'Encrypted DNS provider credentials — provider, domain_pattern, tested_at',
    'server_credentials': 'Encrypted server credentials — server_type (cpanel/ssh/plesk), host, username, domains[]',
    'persistent_agents': 'VPS agents — server_id, last_seen_at, version, status',
    'agent_jobs': 'Agent job queue — job_type (install/renew), domain, cert_id, status (queued/claimed/done/failed)',
    'ssl_health_scores': 'Health score per domain — grade, score, hsts, caa, expiry_days, scanned_at',
    'cert_events': 'Activity feed — event_type (issued/renewed/revoked/agent_installed/private_key_copied), domain, meta',
    'audit_log': 'Private key access audit — action (private_key_copied), user_id, cert_id, actor_email',
    'certvault_keys': 'Encrypted key store — domain, status (active/archived), algorithm, key_size, rotation_count, last_accessed_at',
  },

  // ── Components ────────────────────────────────────────────────────────────
  components: {
    'Nav.jsx': 'Top navigation bar — logo, Features/Pricing links, Resources dropdown (Install Guide, Knowledge Base, CA Intelligence), Sign In button. Mobile hamburger with drawer.',
    'AgentInstall.jsx': 'VPS agent install modal — generates install command with token, polls for agent registration.',
    'CpanelInstall.jsx': 'cPanel certificate install modal — uses cPanel UAPI with API token.',
    'ProGate.jsx': 'Gates Pro-only features — checks usePlan() hook.',
    'useAuth.js': 'Auth hook — supabase.auth.getUser(), onAuthStateChange subscription.',
    'usePlan.js': 'Plan hook — fetches profiles table, returns {plan, isPro, isTeam, isFree}. In testing mode all authenticated users get Pro.',
  },

  // ── Key features ──────────────────────────────────────────────────────────
  features: {
    cert_issuance: 'Issue DV SSL certs via GoGetSSL/RapidSSL. DNS-01 validation. Auto DCV via connected DNS provider. BuyCertificate page at /buy.',
    cert_dashboard: 'Dashboard.jsx — RingGauge countdown, ValidityTimeline bar, status pills, TLS posture check, PQC readiness, cert history (reissues + renewals), private key copy-only with 30s timer + audit log.',
    auto_renew: 'auto-renew-cron edge function. Fires 1 day before cert.expires_at (reissue) and 1 day before order expiry (renewal). Agent installs new cert automatically.',
    vps_agent: 'Bash daemon on user VPS. Polls every 5 minutes. Handles cert install, renewal, health reporting. Install: curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash',
    cpanel_install: 'Auto-install via cPanel UAPI. Needs: hostname, cPanel username, API token (cPanel → Manage API Tokens).',
    keylocker: 'CertVault at /certvault — AES-256-GCM encrypted key storage. Password re-auth required to reveal. 30s auto-close. Immutable audit log. Key rotation via agent-daemon renew job.',
    dns_providers: 'DnsProviders.jsx at /dns-providers — connect Cloudflare, Vercel, GoDaddy, DigitalOcean. Enables auto DNS-01 challenge. Unified domain list groups DNS + Server.',
    tls_posture: 'tls-posture edge function grades domain A-F: HTTPS accessible, HSTS header, security headers, cert validity, trusted CA. Score 0-100%.',
    pqc_readiness: 'Post-quantum readiness check — algorithm (RSA/ECDSA), key size, risk level (ready/low/medium/high), NIST deadline 2030-2035.',
    ssl_health_score: 'Per-domain health grade shown in cert row. Stored in ssl_health_scores table.',
    embed_badge: 'Embeddable SSL status badge — paste <script src="https://easysecurity.in/widget.js" data-domain="yourdomain.com"> on any website.',
    public_status: 'Public SSL status page at /status/username — shows all certs, no login needed.',
    ct_logs: 'SSL Discovery via CT logs — find certs issued for any domain from Certificate Transparency.',
    bulk_scanner: 'BulkScanner at /scan — scan multiple domains at once.',
    certbind: 'CertBind at /certbind — verify private key matches certificate, server serving correct cert, no MITM, servers in sync.',
  },

  // ── Auth flow ──────────────────────────────────────────────────────────────
  auth: {
    flow: 'Invite magic link → user clicks link → hash contains type=invite → Auth.jsx sets mode=set_password → user sets password → signed in.',
    supabase_setting: 'Email confirmation should be OFF in Supabase auth settings.',
    session: 'Persisted in localStorage. supabase.auth.getSession() used throughout.',
    password_reset: 'hash type=recovery → set_password mode → supabase.auth.updateUser({password})',
  },

  // ── DNS Providers ──────────────────────────────────────────────────────────
  dns_providers: {
    cloudflare: { fields: ['apiToken (Zone:DNS:Edit permission)', 'zoneId (optional, auto-detected)'], docs: 'https://developers.cloudflare.com/fundamentals/api/' },
    vercel: { fields: ['apiToken', 'teamId (optional for personal accounts)'], docs: 'https://vercel.com/account/tokens' },
    godaddy: { fields: ['apiKey', 'apiSecret'], docs: 'https://developer.godaddy.com/keys', note: 'Use Production keys, not OTE.' },
    digitalocean: { fields: ['apiToken (Read+Write scope)'], docs: 'https://docs.digitalocean.com/reference/api/' },
  },

  // ── Server types ───────────────────────────────────────────────────────────
  server_types: {
    cpanel: 'cPanel shared hosting (GoDaddy, Bluehost, Hostinger, SiteGround). Needs: domain/host, cPanel username, API token (cPanel → Security → Manage API Tokens). Port: 2083.',
    ssh: 'VPS/cloud server (Ubuntu, Debian, CentOS, Amazon Linux). Needs: IP/hostname, SSH username, private SSH key. Installs via agent or SSH push.',
    plesk: 'Plesk Obsidian/Onyx. Needs: host, admin username, secret key (Extensions → Secret Key Manager). Port: 8443.',
  },

  // ── Common errors & fixes ─────────────────────────────────────────────────
  errors: {
    'DNS-01 challenge failing': [
      'Check CAA records — run: dig CAA yourdomain.com. Must allow letsencrypt.org or be empty.',
      'Check DNS API token permissions — Cloudflare needs Zone:DNS:Edit, not read-only.',
      'Wait for TTL propagation — if you recently changed DNS, wait the full TTL (check: dig +short yourdomain.com TXT).',
      'Verify the TXT record was actually created — use https://toolbox.googleapps.com/apps/dig/ to check _acme-challenge.yourdomain.com TXT.',
      'Check if DNS provider credentials expired in SSLVault — go to /dns-providers and click Test.',
      'If using Cloudflare: make sure the zone ID matches the domain, not a subdomain.',
    ],
    'Certificate expired': [
      'If auto-renew is enabled, check agent status — go to /dns-providers and check your server agent is showing green (last seen < 15 min).',
      'Manually trigger reissue — go to /dashboard, click cert, Actions tab, Reissue certificate.',
      'If agent is offline, SSH into VPS and run: sudo systemctl status sslvault-agent',
      'Restart agent: sudo systemctl restart sslvault-agent',
      'Check auto-renew-cron logs in Supabase dashboard under Edge Functions.',
    ],
    'Agent offline': [
      'SSH into your VPS and check: sudo systemctl status sslvault-agent',
      'If stopped: sudo systemctl start sslvault-agent',
      'If not found: reinstall from /dns-providers → select server → Install agent.',
      'Check agent logs: sudo journalctl -u sslvault-agent -n 50',
      'Agent polls every 5 min — wait 5 min after restart then refresh dashboard.',
      'VPS install command: curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash',
    ],
    'cPanel install failing': [
      'Verify the cPanel API token has SSL functions permission (cPanel → Manage API Tokens).',
      'Check hostname format — should be yourdomain.com (not https://). Port 2083 is added automatically.',
      'If your host uses a custom port, append it: server.host.com:2083',
      'Verify cPanel username (short login name, not email address).',
      'Check if the domain exists in cPanel and SSL can be applied to it.',
    ],
    'Private key not showing': [
      'Private key display is intentionally disabled for security — copy-only via the Copy Key button.',
      'Find it: Dashboard → click cert → Files tab → Copy Key button.',
      'The key is copied to clipboard but never displayed. This is by design.',
      'If you deleted the key: it cannot be recovered. Issue a reissue to get a new cert + key.',
    ],
    'Auth/login issue': [
      'Check you are using the right email address.',
      'If you used a magic link invite, you must set a password first via the invite link.',
      'Password reset: use the forgot password flow — sends recovery link to email.',
      'Make sure Supabase email confirmation is OFF in project auth settings.',
    ],
    'Cert not installing on Nginx': [
      'Check agent is running: sudo systemctl status sslvault-agent',
      'Check agent job log at /dns-providers → select server → Recent activity.',
      'Manual Nginx config: ssl_certificate /etc/nginx/ssl/yourdomain.com/fullchain.pem; ssl_certificate_key /etc/nginx/ssl/yourdomain.com/privkey.pem;',
      'Test config: sudo nginx -t',
      'Reload: sudo systemctl reload nginx',
    ],
    'TLS grade low': [
      'Add HSTS header: add_header Strict-Transport-Security "max-age=63072000" always;',
      'Force TLS 1.2+: ssl_protocols TLSv1.2 TLSv1.3;',
      'Disable weak ciphers: ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;',
      'Add security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy.',
      'Run TLS posture check: Dashboard → click cert → Actions tab → Run check.',
    ],
  },

  // ── Build & deploy ────────────────────────────────────────────────────────
  deploy: {
    process: '1. Clone repo locally. 2. Make changes. 3. npm run build to verify. 4. Push to main branch. 5. Vercel auto-deploys.',
    build_gotcha: 'lucide-react in this project does NOT export Github or Linkedin icons. Use inline SVG instead.',
    design_v2_css: 'src/styles/design-v2.css — import in pages using v2 design system.',
    rollback_prod: 'Production HEAD commit: 1d4e62d (14 May). Rollback codeword: "rollback man".',
    supabase_url: 'https://frthcwkntciaakqsppss.supabase.co',
  },

  // ── Pricing & plans ────────────────────────────────────────────────────────
  plans: {
    free: 'Core SSL issuance, monitoring, basic dashboard.',
    pro: 'CertVault (encrypted key storage), unlimited certs, priority support.',
    team: 'Pro features + seats_total, multi-user access.',
    testing_note: 'Currently in testing mode — all authenticated users get Pro until payment gateway is live.',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH ENGINE — finds relevant KB entries for any question
// ─────────────────────────────────────────────────────────────────────────────
const KEYWORDS = {
  dns: ['dns', 'challenge', 'acme', 'txt', 'record', 'propagat', 'cloudflare', 'godaddy', 'vercel dns', 'digitalocean', 'caa', 'ttl', 'dns-01'],
  agent: ['agent', 'daemon', 'vps', 'offline', 'heartbeat', 'systemctl', 'polling', 'install agent', 'server', 'sslvault-agent'],
  cert: ['certificate', 'cert', 'ssl', 'tls', 'expir', 'renew', 'reissue', 'issued', 'expired', 'rapidssl', 'gogetssl'],
  cpanel: ['cpanel', 'shared hosting', 'api token', 'bluehost', 'godaddy hosting', 'hostinger', 'siteground', 'uapi'],
  key: ['private key', 'key', 'pem', 'copy key', 'keylocker', 'certvault', 'rotate', 'vault', 'encrypt'],
  auth: ['login', 'sign in', 'password', 'magic link', 'invite', 'auth', 'session', 'account'],
  nginx: ['nginx', 'apache', 'web server', 'install cert', 'ssl_certificate', 'config'],
  tls: ['tls grade', 'hsts', 'posture', 'a grade', 'security header', 'cipher', 'pqc', 'quantum'],
  dashboard: ['dashboard', 'monitor', 'status', 'countdown', 'days left', 'ring', 'timeline'],
  deploy: ['deploy', 'build', 'push', 'vercel', 'github', 'branch', 'rollback'],
  routes: ['page', 'route', 'url', 'where', 'find', 'navigate', 'go to'],
  architecture: ['architecture', 'stack', 'supabase', 'edge function', 'database', 'table', 'schema'],
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean)
}

function findCategory(question) {
  const q = question.toLowerCase()
  const scores = {}
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    scores[cat] = words.filter(w => q.includes(w)).length
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).filter(([, s]) => s > 0).map(([c]) => c)
}

function findError(question) {
  const q = question.toLowerCase()
  for (const [key, steps] of Object.entries(KB.errors)) {
    const keyWords = key.toLowerCase().split(/[\s/-]/)
    const matches = keyWords.filter(w => w.length > 2 && q.includes(w)).length
    if (matches >= 2) return { issue: key, steps }
  }
  return null
}

function buildAnswer(question) {
  const q = question.toLowerCase()
  const cats = findCategory(question)
  const errorMatch = findError(question)

  // ── Direct error/problem match ─────────────────────────────────────
  if (errorMatch) {
    return {
      type: 'steps',
      title: `Fix: ${errorMatch.issue}`,
      steps: errorMatch.steps,
      hint: 'These steps come from your actual SSLVault codebase.',
    }
  }

  // ── Specific questions ─────────────────────────────────────────────
  if (q.match(/where.*(private key|copy key|pem)/)) {
    return { type: 'info', title: 'Private Key Location', body: 'Dashboard → click any cert row → Files tab → Copy Key button. Key is copy-only (never displayed) with a 30s clipboard timer and audit log entry.' }
  }
  if (q.match(/(install|setup|add|connect).*(cloudflare|godaddy|dns provider|vercel dns)/)) {
    const p = q.includes('cloudflare') ? 'cloudflare' : q.includes('godaddy') ? 'godaddy' : q.includes('vercel') ? 'vercel' : 'cloudflare'
    const pInfo = KB.dns_providers[p]
    return { type: 'steps', title: `Connect ${p.charAt(0).toUpperCase()+p.slice(1)} DNS`, steps: [`Go to /dns-providers → Add DNS + Server button`, `Select ${p} as provider`, `Required fields: ${pInfo.fields.join(', ')}`, `Click Save DNS provider`, `Click Test to verify credentials`, `Docs: ${pInfo.docs}`] }
  }
  if (q.match(/(install|setup).*(agent|vps|linux|ubuntu)/)) {
    return { type: 'code', title: 'Install VPS Agent', code: 'curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash', note: 'Installs background daemon, creates systemd service, registers with your account. Then: sudo systemctl status sslvault-agent' }
  }
  if (q.match(/(install|setup).*(cpanel|shared host)/)) {
    return { type: 'steps', title: 'cPanel Certificate Install', steps: KB.errors['cPanel install failing'] }
  }
  if (q.match(/(auto.?renew|renewal|automatic)/)) {
    return { type: 'info', title: 'Auto-Renewal Logic', body: 'auto-renew-cron fires 1 day before cert.expires_at (reissue) and 1 day before your subscription order expires (renewal). The VPS agent automatically installs the new cert. Check agent is online at /dns-providers.' }
  }
  if (q.match(/(edge function|supabase function)/)) {
    const fns = Object.entries(KB.edge_functions).map(([k, v]) => `${k}: ${v}`).join('\n')
    return { type: 'list', title: 'Edge Functions', items: Object.entries(KB.edge_functions).map(([k, v]) => `${k} — ${v}`) }
  }
  if (q.match(/(database|table|schema|db)/)) {
    return { type: 'list', title: 'Database Tables', items: Object.entries(KB.tables).map(([k, v]) => `${k} — ${v}`) }
  }
  if (q.match(/(route|page|url|navigate|where is)/)) {
    return { type: 'list', title: 'App Routes', items: Object.entries(KB.routes).map(([k, v]) => `${k} → ${v}`) }
  }
  if (q.match(/(stack|architecture|tech|built with|supabase|vercel)/)) {
    return { type: 'info', title: 'SSLVault Architecture', body: `Stack: ${KB.architecture.stack}\n\nProduction: ${KB.architecture.production_urls.join(', ')}\nSupabase: ${KB.architecture.supabase_project}\nGitHub: ${KB.architecture.github_repo}\nDesign: ${KB.architecture.design_system}` }
  }
  if (q.match(/(plan|pro|pricing|free|upgrade)/)) {
    return { type: 'info', title: 'Plans', body: `Free: ${KB.plans.free}\nPro: ${KB.plans.pro}\nTeam: ${KB.plans.team}\n\nNote: ${KB.plans.testing_note}` }
  }
  if (q.match(/(tls|grade|hsts|posture|quantum|pqc)/)) {
    return { type: 'steps', title: 'Improve TLS Grade', steps: KB.errors['TLS grade low'] }
  }
  if (q.match(/(deploy|build|push|github|rollback)/)) {
    return { type: 'info', title: 'Deploy Process', body: `${KB.deploy.process}\n\nGotcha: ${KB.deploy.build_gotcha}\nRollback: ${KB.deploy.rollback_prod}` }
  }
  if (q.match(/(keylocker|certvault|vault|encrypt key|rotate)/)) {
    return { type: 'info', title: 'KeyLocker / CertVault', body: KB.features.keylocker + '\n\nPath: /certvault. Password re-auth required. AES-256-GCM encryption. Auto-closes in 30s after copy. Full audit log in the Audit log tab.' }
  }
  if (q.match(/(certbind|binding|verify cert|key match)/)) {
    return { type: 'info', title: 'CertBind', body: KB.features.certbind + '\n\nPath: /certbind. Checks 4 layers: private key matches cert, server serving correct cert, no MITM, all servers in sync.' }
  }

  // ── Category-based fallback ────────────────────────────────────────
  if (cats.includes('agent')) return { type: 'steps', title: 'Agent Troubleshooting', steps: KB.errors['Agent offline'] }
  if (cats.includes('cert')) return { type: 'steps', title: 'Certificate Troubleshooting', steps: KB.errors['Certificate expired'] }
  if (cats.includes('dns')) return { type: 'steps', title: 'DNS Challenge Fix', steps: KB.errors['DNS-01 challenge failing'] }
  if (cats.includes('key')) return { type: 'info', title: 'Private Key', body: 'Private keys are stored encrypted (AES-256-GCM) in CertVault. Access at /certvault. In Dashboard → Files tab, use Copy Key for 30s copy-only access. All access is audit logged.' }
  if (cats.includes('auth')) return { type: 'steps', title: 'Auth Troubleshooting', steps: KB.errors['Auth/login issue'] }
  if (cats.includes('nginx')) return { type: 'steps', title: 'Nginx Install', steps: KB.errors['Cert not installing on Nginx'] }

  // ── Catch-all ──────────────────────────────────────────────────────
  return {
    type: 'help',
    title: 'How can I help?',
    body: 'I know every line of your SSLVault codebase. Ask me about:',
    topics: ['DNS challenge failing', 'Agent offline', 'Certificate expired', 'cPanel install', 'Private key location', 'Auto-renewal setup', 'TLS grade improvement', 'Edge functions', 'Database tables', 'App routes', 'Deploy process'],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK CHIPS — most common support questions
// ─────────────────────────────────────────────────────────────────────────────
const CHIPS = [
  'DNS-01 challenge failing',
  'Agent is offline',
  'My certificate expired',
  'Where is the private key?',
  'How does auto-renew work?',
  'cPanel install failing',
  'How to improve TLS grade?',
  'Show all edge functions',
  'Show all app routes',
]

// ─────────────────────────────────────────────────────────────────────────────
// RENDER ANSWER
// ─────────────────────────────────────────────────────────────────────────────
function Answer({ answer }) {
  const C = {
    green: '#10b981', surface: '#1a1a1a', border: 'rgba(255,255,255,0.08)',
    text: '#f0f0f0', muted: '#888', code: '#a3e635',
  }
  if (answer.type === 'steps') return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.green, marginBottom:8 }}>{answer.title}</div>
      {answer.steps.map((s, i) => (
        <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'flex-start' }}>
          <div style={{ width:18, height:18, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:C.green, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</div>
          <span style={{ fontSize:12.5, color:C.text, lineHeight:1.6 }}>{s}</span>
        </div>
      ))}
      {answer.hint && <div style={{ fontSize:10, color:C.muted, marginTop:8, borderTop:'0.5px solid '+C.border, paddingTop:8 }}>{answer.hint}</div>}
    </div>
  )
  if (answer.type === 'code') return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.green, marginBottom:8 }}>{answer.title}</div>
      <div style={{ background:'#0a0a0a', borderRadius:8, padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:C.code, marginBottom:8, wordBreak:'break-all' }}>{answer.code}</div>
      {answer.note && <div style={{ fontSize:12, color:'#aaa', lineHeight:1.6 }}>{answer.note}</div>}
    </div>
  )
  if (answer.type === 'list') return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.green, marginBottom:8 }}>{answer.title}</div>
      {answer.items.map((item, i) => (
        <div key={i} style={{ fontSize:11.5, color:C.text, lineHeight:1.7, borderBottom:'0.5px solid '+C.border, paddingBottom:4, marginBottom:4 }}>
          <span style={{ color:C.green }}>›</span> {item}
        </div>
      ))}
    </div>
  )
  if (answer.type === 'help') return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.green, marginBottom:6 }}>{answer.title}</div>
      <div style={{ fontSize:12, color:'#aaa', marginBottom:10 }}>{answer.body}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {answer.topics.map(t => (
          <span key={t} style={{ fontSize:10, padding:'3px 9px', borderRadius:12, background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.2)', color:C.green, cursor:'pointer' }}>{t}</span>
        ))}
      </div>
    </div>
  )
  // info
  return (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.green, marginBottom:6 }}>{answer.title}</div>
      <div style={{ fontSize:12.5, color:C.text, lineHeight:1.75, whiteSpace:'pre-line' }}>{answer.body}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VaultBrain() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', answer: { type: 'help', title: 'VaultBrain — SSLVault Expert', body: 'I know every line of your codebase. Ask me anything:', topics: ['DNS challenge failing', 'Agent offline', 'Auto-renewal', 'Private key', 'App routes', 'Edge functions'] } }
  ])
  const [input, setInput]     = useState('')
  const [chipsShown, setChipsShown] = useState(true)
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, open])

  const ask = (question) => {
    if (!question.trim()) return
    setChipsShown(false)
    const answer = buildAnswer(question)
    setMessages(m => [...m, { role: 'user', text: question }, { role: 'ai', answer }])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const BG    = '#0a0a0a'
  const SURF  = '#111111'
  const SURF2 = '#1a1a1a'
  const GREEN = '#10b981'
  const GBDR  = 'rgba(16,185,129,0.25)'
  const BDR   = 'rgba(255,255,255,0.08)'
  const TEXT  = '#f0f0f0'
  const MUTED = '#888'

  return (
    <>
      {/* ── Floating button ── */}
      <button onClick={() => setOpen(o => !o)} title="VaultBrain — SSLVault Expert"
        style={{ position:'fixed', bottom:24, right:24, zIndex:1000,
          width:50, height:50, borderRadius:'50%',
          background: open ? '#1a1a1a' : '#10b981',
          border: '1.5px solid ' + (open ? 'rgba(255,255,255,0.1)' : '#10b981'),
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: open ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(16,185,129,0.4)',
          transition:'all 0.2s ease' }}>
        {open
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
        }
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{ position:'fixed', bottom:84, right:24, zIndex:999,
          width:380, height:560, background:BG,
          border:'1px solid '+GBDR, borderRadius:16,
          display:'flex', flexDirection:'column', overflow:'hidden',
          boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
          animation:'vbSlideUp 0.2s cubic-bezier(0.16,1,0.3,1)' }}>

          {/* Header */}
          <div style={{ background:SURF, borderBottom:'1px solid '+BDR,
            padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%',
              background:'rgba(16,185,129,0.15)', border:'1.5px solid '+GREEN,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>VaultBrain</div>
              <div style={{ fontSize:10, color:GREEN }}>Knows your codebase · zero API · always free</div>
            </div>
            <div style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:10,
              background:'rgba(16,185,129,0.1)', border:'0.5px solid rgba(16,185,129,0.2)',
              color:GREEN, letterSpacing:'0.04em' }}>SSLVAULT</div>
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'14px 12px', display:'flex', flexDirection:'column', gap:12 }}
            css={`&::-webkit-scrollbar{width:3px}&::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}`}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignSelf: msg.role==='user'?'flex-end':'flex-start', maxWidth:'92%' }}>
                {msg.role === 'ai' && (
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0,
                    background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, fontSize:10, color:GREEN, fontWeight:700 }}>V</div>
                )}
                <div style={{ padding:'10px 13px', borderRadius:12,
                  background: msg.role==='user' ? 'rgba(16,185,129,0.1)' : SURF2,
                  border: '0.5px solid ' + (msg.role==='user' ? 'rgba(16,185,129,0.2)' : BDR),
                  borderBottomLeftRadius: msg.role==='ai' ? 3 : 12,
                  borderBottomRightRadius: msg.role==='user' ? 3 : 12 }}>
                  {msg.role === 'user'
                    ? <div style={{ fontSize:13, color:TEXT }}>{msg.text}</div>
                    : <Answer answer={msg.answer}/>}
                </div>
                {msg.role === 'user' && (
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0,
                    background:'#1e293b', border:'1px solid rgba(99,179,237,0.3)',
                    display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, fontSize:10, color:'#63b3ed', fontWeight:700 }}>U</div>
                )}
              </div>
            ))}
          </div>

          {/* Quick chips */}
          {chipsShown && (
            <div style={{ padding:'0 10px 8px', display:'flex', flexWrap:'wrap', gap:5 }}>
              {CHIPS.slice(0,5).map(c => (
                <button key={c} onClick={() => ask(c)}
                  style={{ fontSize:10.5, padding:'4px 10px', borderRadius:20, cursor:'pointer',
                    background:SURF2, border:'0.5px solid '+BDR, color:MUTED, fontFamily:'inherit',
                    transition:'all 0.12s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=GBDR;e.currentTarget.style.color=GREEN}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=BDR;e.currentTarget.style.color=MUTED}}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 12px', background:SURF, borderTop:'1px solid '+BDR, display:'flex', gap:8, alignItems:'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'}}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(input)}}}
              placeholder="Ask anything about SSLVault…"
              rows={1}
              style={{ flex:1, background:SURF2, border:'0.5px solid '+BDR, borderRadius:8,
                padding:'9px 12px', color:TEXT, fontSize:12.5, fontFamily:'inherit',
                resize:'none', outline:'none', lineHeight:1.5, minHeight:38, maxHeight:80,
                transition:'border-color 0.15s' }}
              onFocus={e=>e.target.style.borderColor=GBDR}
              onBlur={e=>e.target.style.borderColor=BDR}/>
            <button onClick={() => ask(input)}
              style={{ width:36, height:36, borderRadius:8, background:GREEN, border:'none',
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, transition:'all 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#0ea570'}
              onMouseLeave={e=>e.currentTarget.style.background=GREEN}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes vbSlideUp {
          from { opacity:0; transform:translateY(12px) scale(0.97) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
      `}</style>
    </>
  )
}
