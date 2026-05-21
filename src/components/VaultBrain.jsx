// VaultBrain.jsx — SSLVault Zero-API Expert Agent
// Built from reading every line of this codebase.
// No external API. No cost. No dependency. Runs forever.
// Usage: import VaultBrain from './VaultBrain' → <VaultBrain /> in Nav

import { useState, useRef, useEffect, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
//  KNOWLEDGE BASE  — extracted from every file in this repo
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://frthcwkntciaakqsppss.supabase.co'

const KB = {
  architecture: {
    stack: 'React + Vite frontend, Supabase Edge Functions backend, Vercel hosting. Auto-deploy on push to main branch.',
    supabase_project: 'frthcwkntciaakqsppss',
    vercel_project: 'freeencryption (prj_RbtRZ3pm5TIz1nGFN9zsMNGXVdCB)',
    github: 'mathimcafee-dev/LetsEncrypt — main branch',
    production: 'easysecurity.in and freeencryption.vercel.app',
    design: 'Design v2 — #0a0a0a background, #10b981 green, split list+detail layout, tokens in src/styles/design-v2.css. DnsProviders is the only fully migrated v2 page.',
    auth_note: 'Supabase email confirmation must be OFF. Auth flow: invite magic link → set-password page → signed in.',
  },

  routes: [
    { path: '/', desc: 'Home page (logged out) or CLMHome dashboard (logged in)' },
    { path: '/dashboard', desc: 'Certificate dashboard — list, detail panel, stats, activity feed, PQC check' },
    { path: '/certvault', desc: 'KeyLocker/CertVault — AES-256 encrypted key storage, rotation, audit log (Pro only)' },
    { path: '/buy', desc: 'Issue new SSL certificate via RapidSSL/GoGetSSL' },
    { path: '/install', desc: 'Install guide — VPS agent, cPanel, Nginx manual, Apache manual' },
    { path: '/integrations', desc: 'Integrations page — Cloudflare, Vercel, agent setup' },
    { path: '/knowledge-base', desc: 'Full documentation and guides' },
    { path: '/dns-providers', desc: 'DnsProviders — connect DNS providers and servers, unified domain view' },
    { path: '/auth', desc: 'Sign in / set-password page' },
    { path: '/admin', desc: 'AdminAnalytics — master admin only' },
    { path: '/agent-health', desc: 'AgentHealth — VPS agent monitoring' },
    { path: '/cert-intelligence', desc: 'CAIntelligenceHub — CA intelligence and insights' },
    { path: '/ca-connectors', desc: 'CAConnectors — connect external CAs' },
    { path: '/scan', desc: 'BulkScanner — scan multiple domains at once' },
    { path: '/status or /status/:user', desc: 'PublicStatus — public SSL status page, no login needed' },
    { path: '/certbind', desc: 'CertBind — verify key/cert binding, 4-layer verification' },
    { path: '/pricing', desc: 'Pricing page — Free, Pro, Team plans' },
    { path: '/about', desc: 'About SSLVault' },
    { path: '/developer', desc: 'Developer/API docs' },
  ],

  edge_functions: [
    { name: 'auto-renew-cron', desc: 'Handles automatic certificate renewal. Fires 1 day before cert.expires_at (reissue) and 1 day before order expiry (renewal). Dispatches agent jobs for install.' },
    { name: 'gogetssl-issue', desc: 'Issues certificates via GoGetSSL/RapidSSL API. Handles DV validation, DNS-01 challenge, order tracking, cert delivery to DB.' },
    { name: 'keylocker', desc: 'CertVault key vault operations — list keys, fetch (decrypt + audit log), archive old keys. AES-256-GCM encryption per key.' },
    { name: 'send-renewal-email', desc: 'Sends expiry alert emails via Resend. Reads threshold from user settings. Triggered by auto-renew-cron.' },
    { name: 'rapidssl-issue', desc: 'RapidSSL-specific cert operations — check_status, get_history (reissues + renewals), reissue (same order), renew (new order). Called from Dashboard cert detail.' },
    { name: 'tls-posture', desc: 'TLS posture check — grades domains A-F on: HTTPS accessible, HSTS header, security headers, cert validity, trusted CA. Also PQC risk check (pqc_check, pqc_check_all).' },
    { name: 'dns-provider', desc: 'DNS credential CRUD — save, list, update, delete, test. Also auto_add action for automatic DNS-01 TXT record creation. Supports Cloudflare, Vercel, GoDaddy, DigitalOcean.' },
    { name: 'server-credentials', desc: 'Server credential CRUD — save, list, update, delete for cPanel/SSH/Plesk servers. Credentials encrypted before storage.' },
    { name: 'agent-daemon', desc: 'VPS agent coordination — create_install_command (generates pre-auth token), list_agents, dispatch (queue install/renew job), list_jobs, deregister.' },
    { name: 'certvault', desc: 'Alias/proxy for keylocker. Used by CertVault page for key vault operations.' },
    { name: 'ca-import', desc: 'CA certificate import and sync.' },
    { name: 'digicert-sync-cron', desc: 'DigiCert certificate sync cron job.' },
  ],

  tables: [
    { name: 'certificates', cols: 'id, user_id, domain, common_name, status (active/revoked), expires_at, issued_at, created_at, cert_pem, private_key_pem, ggs_order_id, dcv_method, pqc_risk, tls_grade, tls_score, tls_details, key_algorithm, key_size_bits, certvault_key_id' },
    { name: 'ssl_orders', cols: 'id, user_id, ggs_order_id, status (active/dv_pending), product_name, product_code, period (months), domain, dcv_txt_name, dcv_txt_value, dcv_cname_name, dcv_cname_value, admin_email, admin_first_name, admin_last_name, admin_phone, ggs_invoice_id' },
    { name: 'cert_reissues', cols: 'id, cert_id, user_id, reissue_number, status, triggered_by, install_status, install_method, installed_at, issued_at, expires_at, cert_pem, ggs_order_id, auto_install_status, auto_install_error' },
    { name: 'profiles', cols: 'id (=user_id), plan (free/pro/team), plan_expires_at, stripe_customer_id, stripe_subscription_id, seats_total, seats_used' },
    { name: 'certvault_keys', cols: 'id, user_id, domain, status (active/archived), algorithm, key_size, rotation_count, last_accessed_at, created_at, archived_at, expires_at' },
    { name: 'dns_credentials', cols: 'id, user_id, provider (cloudflare/vercel/godaddy/digitalocean), domain_pattern, label, credentials_enc, tested_at, created_at' },
    { name: 'server_credentials', cols: 'id, user_id, server_type (cpanel/ssh/plesk), nickname, host, username, port, domains[], credentials_enc, install_mode, created_at' },
    { name: 'persistent_agents', cols: 'id, user_id, server_id, last_seen_at, version, status, os_info, web_server' },
    { name: 'agent_jobs', cols: 'id, user_id, agent_id, cert_id, domain, job_type (install/renew), status (queued/claimed/done/failed), error_message, created_at, claimed_at, completed_at' },
    { name: 'ssl_health_scores', cols: 'id, user_id, domain, grade, score, hsts, caa, expiry_days, scanned_at' },
    { name: 'cert_events', cols: 'id, user_id, cert_id, domain, event_type (issued/renewed/revoked/agent_installed/private_key_copied), meta, created_at' },
    { name: 'audit_log', cols: 'id, user_id, cert_id, action (private_key_copied), actor_email, metadata (domain, ip), created_at' },
  ],

  components: {
    'Nav.jsx': 'Top nav — logo, Features/Pricing links, Resources dropdown (Install Guide, Knowledge Base, CA Intelligence), Sign In CTA. Mobile hamburger with slide-down drawer.',
    'AgentInstall.jsx': 'VPS agent install modal — calls agent-daemon/create_install_command to generate pre-auth token, builds install curl command, polls for agent registration every 5s.',
    'CpanelInstall.jsx': 'cPanel certificate install modal — calls server-credentials edge function via cPanel UAPI. Needs host, username, API token.',
    'ProGate.jsx': 'Gates Pro-only features. Uses usePlan() hook. Redirects free users to /pricing.',
    'useAuth.js': 'Auth hook — supabase.auth.getUser() on mount, onAuthStateChange listener. Returns {user, loading}.',
    'usePlan.js': 'Plan hook — fetches profiles table, returns {plan, isPro, isTeam, isFree, refresh}. Currently in TESTING MODE: all authenticated users get Pro regardless of DB plan.',
  },

  dns_providers: {
    cloudflare: {
      fields: ['apiToken — needs Zone:DNS:Edit permission (NOT read-only)', 'zoneId — optional, auto-detected from domain'],
      docs: 'https://developers.cloudflare.com/fundamentals/api/',
      note: 'Create token at Cloudflare Dashboard → My Profile → API Tokens → Create Token → use "Edit zone DNS" template.',
    },
    vercel: {
      fields: ['apiToken', 'teamId — optional, leave blank for personal accounts'],
      docs: 'https://vercel.com/account/tokens',
      note: 'Token needs DNS record write access. Find teamId in Vercel team settings.',
    },
    godaddy: {
      fields: ['apiKey', 'apiSecret'],
      docs: 'https://developer.godaddy.com/keys',
      note: 'Use Production keys, NOT OTE (test) keys. Both key and secret required.',
    },
    digitalocean: {
      fields: ['apiToken — needs Read + Write scope'],
      docs: 'https://cloud.digitalocean.com/account/api/tokens',
      note: 'Generate from DigitalOcean Dashboard → API → Generate New Token.',
    },
  },

  server_types: {
    cpanel: {
      desc: 'cPanel shared hosting — GoDaddy, Bluehost, Hostinger, SiteGround',
      fields: ['host — your domain (e.g. yourdomain.com), port 2083 auto-added', 'username — cPanel short login name (NOT email)', 'api_token — cPanel → Security → Manage API Tokens → Create (needs SSL access)'],
      note: 'If host uses custom port: server.host.com:2083',
    },
    ssh: {
      desc: 'VPS/Cloud Server — Ubuntu, Debian, CentOS, Amazon Linux',
      fields: ['host — public IP or hostname', 'username — root or sudo user', 'ssh_key — paste full private key (-----BEGIN OPENSSH PRIVATE KEY-----)'],
      install: 'curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash',
      note: 'Agent is recommended — one-time install, then zero-touch renewals forever.',
    },
    plesk: {
      desc: 'Plesk Obsidian or Onyx panel',
      fields: ['host — Plesk hostname or IP', 'username — admin', 'api_token — Extensions → Secret Key Manager'],
      note: 'Default port 8443.',
    },
  },

  troubleshooting: {
    'dns_challenge': {
      title: 'DNS-01 Challenge Failing',
      steps: [
        'Check CAA records: run  dig CAA yourdomain.com  — must be empty OR include letsencrypt.org. If it has only digicert.com or sectigo.com, add: 0 issue "letsencrypt.org"',
        'Verify DNS API token permissions — Cloudflare needs Zone:DNS:Edit (not read-only). Test it in SSLVault: go to /dns-providers → click your domain → click Test button.',
        'Check TXT record was actually created — use https://toolbox.googleapps.com/apps/dig/ and look up _acme-challenge.yourdomain.com TXT record.',
        'Wait for TTL propagation — if you recently changed DNS settings, wait the full TTL (often 300s–3600s). Check current TTL: dig +short yourdomain.com TXT',
        'If using Cloudflare: verify the Zone ID matches the root domain, not a subdomain. Zone ID is in the domain Overview sidebar.',
        'Check if DNS credentials expired in SSLVault — /dns-providers → select domain → click Test. If it shows "Auth expired", re-enter credentials.',
        'If auto-DCV is not set up: go to /dns-providers → Add DNS + Server → connect your DNS provider, then retry issuance.',
      ],
    },
    'cert_expired': {
      title: 'Certificate Expired / Not Renewing',
      steps: [
        'Check your VPS agent is online — go to /dns-providers, find your server. Green dot = active (seen < 15 min ago). If red/grey, see "Agent Offline" steps.',
        'Manually trigger reissue: Dashboard → click the cert → Actions tab → click "Reissue certificate". This fires auto-renew immediately.',
        'Check auto-renew-cron edge function logs in Supabase Dashboard → Edge Functions → auto-renew-cron → Logs.',
        'Verify DNS provider is still connected and healthy — expired Cloudflare token is the most common auto-renew failure.',
        'If cert was manually installed (Nginx/Apache), you must reissue and reinstall manually OR install the VPS agent to automate it.',
        'Check for Let\'s Encrypt rate limits: max 5 duplicate certificates per domain per week. If hit, wait 7 days.',
      ],
    },
    'agent_offline': {
      title: 'VPS Agent Offline',
      steps: [
        'SSH into your VPS and check agent status: sudo systemctl status sslvault-agent',
        'If stopped, start it: sudo systemctl start sslvault-agent',
        'If not found / install failed, reinstall from /dns-providers → select your server → click "Install agent" button.',
        'Check agent logs for errors: sudo journalctl -u sslvault-agent -n 100 --no-pager',
        'Verify internet connectivity from VPS: curl -s https://easysecurity.in/health',
        'Agent polls every 5 minutes — after restarting, wait 5 min then refresh /dns-providers.',
        'If agent was never installed: go to /dns-providers → find your server → click "Install agent" → copy the generated curl command → run it on your VPS.',
      ],
    },
    'cpanel_failing': {
      title: 'cPanel Certificate Install Failing',
      steps: [
        'Check API token has SSL permission — cPanel → Security → Manage API Tokens → find your token → ensure SSL functions are allowed.',
        'Verify the hostname format — must be yourdomain.com (no https://, no trailing slash). Port 2083 is appended automatically by SSLVault.',
        'If using a non-standard port: enter server.host.com:2083 as the hostname.',
        'Verify your cPanel username is the SHORT login name, NOT your email address.',
        'Confirm the domain exists in cPanel File Manager and has a document root.',
        'Try testing the connection — /dns-providers → select domain → click Test in the server detail panel.',
        'Some hosts (e.g. Hostinger) use cPanel with custom API endpoints — check your host\'s knowledge base for their cPanel API hostname.',
      ],
    },
    'tls_grade': {
      title: 'Improving TLS Grade',
      steps: [
        'Run TLS posture check first: Dashboard → click cert → Actions tab → "Run check" button. This shows exactly what is failing.',
        'Add HSTS header (Nginx):  add_header Strict-Transport-Security "max-age=63072000" always;',
        'Force TLS 1.2+ only (Nginx):  ssl_protocols TLSv1.2 TLSv1.3;',
        'Use strong ciphers (Nginx):  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;  and  ssl_prefer_server_ciphers off;',
        'Add security headers:  add_header X-Content-Type-Options nosniff;  add_header X-Frame-Options DENY;  add_header Referrer-Policy "strict-origin-when-cross-origin";',
        'Make sure HTTPS redirect is in place for HTTP traffic.',
        'Reload Nginx after changes: sudo nginx -t && sudo systemctl reload nginx',
      ],
    },
    'nginx_install': {
      title: 'Manual Nginx Certificate Install',
      steps: [
        'Download cert files from Dashboard → click cert → Files tab → Save button for cert.pem and Copy Key for private key.',
        'Upload to server: sudo mkdir -p /etc/nginx/ssl/yourdomain.com',
        'Place cert: sudo cp fullchain.pem /etc/nginx/ssl/yourdomain.com/fullchain.pem',
        'Place key: sudo cp privkey.pem /etc/nginx/ssl/yourdomain.com/privkey.pem && sudo chmod 600 /etc/nginx/ssl/yourdomain.com/privkey.pem',
        'Nginx server block: ssl_certificate /etc/nginx/ssl/yourdomain.com/fullchain.pem;  ssl_certificate_key /etc/nginx/ssl/yourdomain.com/privkey.pem;',
        'Test and reload: sudo nginx -t && sudo systemctl reload nginx',
        'Consider installing the VPS agent for zero-touch future renewals.',
      ],
    },
    'private_key': {
      title: 'Private Key Access',
      steps: [
        'Private key is NEVER displayed — copy-only by design for security.',
        'Find it: Dashboard → click the cert row → Files tab → click "Copy Key" button.',
        'After clicking Copy Key: the key is silently copied to your clipboard. A 30-second timer starts. After 30s it resets.',
        'Every Copy Key action is logged to the audit_log table (action: private_key_copied, with your email and timestamp).',
        'In CertVault (/certvault): click "Reveal key" → enter your password → key is masked but copy button copies the real key.',
        'If you deleted the key from SSLVault: it cannot be recovered. You must reissue the certificate to get a new key.',
        'To delete the key from SSLVault servers after installing it: Dashboard → cert → Files tab → Delete button (with 3-checkbox confirmation).',
      ],
    },
    'auth': {
      title: 'Auth / Login Issues',
      steps: [
        'Use the email address your account was created with.',
        'If you received an invite link: click the link → you will be taken to the set-password page. Set a password there first.',
        'For password reset: on the sign in page → Forgot password → enter email → click the recovery link in the email → set new password.',
        'If the magic link has expired (>1 hour): ask the admin to resend the invite.',
        'Make sure Supabase email confirmation is OFF in your Supabase project → Authentication → Providers → Email → Confirm email: OFF.',
        'If you see "Email not confirmed" error: this means email confirmation is ON in Supabase — turn it off in Supabase project settings.',
      ],
    },
  },

  features: {
    auto_renew: 'auto-renew-cron fires 1 day before cert.expires_at (triggers reissue on same GoGetSSL order) AND 1 day before the subscription order expires (triggers renewal — new GoGetSSL order). VPS agent installs the new cert within its next 5-minute poll cycle.',
    vps_agent: 'Lightweight bash daemon installed on your VPS. Polls SSLVault every 5 minutes for pending jobs. Handles cert install, renewal, health reporting. Supports Nginx and Apache auto-detection. Install: curl -fsSL https://easysecurity.in/agent-install.sh | sudo bash',
    keylocker: 'CertVault at /certvault — AES-256-GCM encrypted key storage per certificate. Password re-authentication required to reveal any key. 30-second auto-close timer. Keys are masked in UI but real key is in clipboard. Immutable audit log. Key rotation dispatches a renew job via agent-daemon. Archived keys kept 30 days then destroyed. Pro plan only.',
    tls_posture: 'TLS posture check via tls-posture edge function — grades A-F based on: HTTPS accessible (+20pts), HSTS header (+20pts), security headers (+10pts), cert validity (+30pts), trusted CA (+20pts). Total = score%, grade A=90+, B=70+, C=50+, D=30+, F=0.',
    pqc: 'Post-quantum cryptography readiness check — identifies RSA/ECDSA key algorithm and size, assigns risk level (ready/low/medium/high), explains NIST deadline (2030-2035 for RSA/ECDSA deprecation). NIST finalized ML-DSA, SLH-DSA, ML-KEM in August 2024.',
    certbind: 'CertBind at /certbind — verifies 4 layers: private key matches certificate (fingerprint check), server is serving the correct certificate, no MITM interception, all your servers are in sync.',
    embed_badge: 'Add SSL status badge to any website: <script src="https://easysecurity.in/widget.js" data-domain="yourdomain.com" async></script>',
    public_status: 'Public SSL status page at /status/username — shows all certs for that user publicly, no login needed. Share with clients.',
    dns_plus_server: 'Connect both DNS provider and server for a domain to get full automation: DNS-01 challenge handled automatically + cert installed to server automatically after issuance.',
  },

  deploy: {
    flow: '1. Make changes in src/ 2. npm run build (must pass — catches JSX errors) 3. Push to main branch 4. Vercel auto-deploys in ~1 minute.',
    build_gotcha: 'IMPORTANT: lucide-react in this project does NOT export Github or Linkedin icons. Always use inline SVG for those. Running npm run build will catch this.',
    rollback: 'Production HEAD: 1d4e62d (14 May 2025). Rollback codeword: "rollback man". Rollback deployment: dpl_B5muHTct9ksd3S7cNTRoRp9Ue76e (commit 7f64eb4).',
    env_vars: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables.',
    supabase_url: 'https://frthcwkntciaakqsppss.supabase.co',
  },

  plans: {
    free: 'SSL certificate issuance, expiry monitoring, basic dashboard, VPS agent install.',
    pro: 'Everything in Free + CertVault encrypted key storage + key rotation + audit log + priority support.',
    team: 'Everything in Pro + multiple seats (seats_total/seats_used in profiles table).',
    testing_mode: 'usePlan.js currently returns Pro for ALL authenticated users (testing mode until payment gateway goes live).',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
//  INTENT DETECTION — matches question to the right knowledge
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS = [
  { id: 'dns_challenge',  re: /dns.{0,20}(fail|error|challenge|not work|propagat|caa|txt record|acme)/i },
  { id: 'dns_challenge',  re: /(challenge|acme|txt|dns-01).{0,30}(fail|error|not|issue)/i },
  { id: 'cert_expired',   re: /(cert|ssl|tls).{0,20}(expir|renew|not renew|auto.renew|auto renew)/i },
  { id: 'cert_expired',   re: /(expir|renew).{0,20}(cert|ssl|issue|problem|fail)/i },
  { id: 'agent_offline',  re: /(agent|daemon|vps).{0,20}(offline|down|not.{0,5}work|fail|restart|install)/i },
  { id: 'agent_offline',  re: /(install|setup).{0,20}agent/i },
  { id: 'cpanel_failing', re: /cpanel|shared.host|bluehost|hostinger|siteground|api.token.{0,20}cpanel/i },
  { id: 'tls_grade',      re: /(tls|ssl).{0,20}(grade|score|improve|hsts|header|cipher|posture)/i },
  { id: 'nginx_install',  re: /nginx.{0,20}(install|config|cert|ssl)|install.{0,20}nginx/i },
  { id: 'private_key',    re: /(private.key|copy.key|key.pem|reveal.key|where.{0,10}key)/i },
  { id: 'auth',           re: /(login|sign.in|password|magic.link|invite|account|auth|session)/i },
]

const TOPIC_PATTERNS = [
  { id: 'routes',         re: /route|page|url|where.{0,15}(page|go|find|navigate)|all.pages/i },
  { id: 'edge_functions', re: /edge.func|supabase.func|function|backend/i },
  { id: 'tables',         re: /table|database|schema|db|supabase.table/i },
  { id: 'architecture',   re: /stack|architecture|tech|built.with|how.{0,10}(work|built|made)/i },
  { id: 'auto_renew',     re: /auto.renew|automatic.renew|renewal.logic|how.{0,10}renew/i },
  { id: 'vps_agent',      re: /how.{0,10}agent.work|what.{0,10}agent.do|agent.logic|agent.poll/i },
  { id: 'keylocker',      re: /keylocker|certvault|vault|key.storage|encrypt.key|rotate.key/i },
  { id: 'tls_posture',    re: /tls.posture|tls.check|grade.work|how.{0,10}grade/i },
  { id: 'pqc',            re: /pqc|post.quantum|quantum|nist|ml-dsa|crystals/i },
  { id: 'certbind',       re: /certbind|cert.bind|binding|key.match|verify.cert/i },
  { id: 'embed',          re: /embed|badge|widget|status.page/i },
  { id: 'deploy',         re: /deploy|build|push|vercel|github|rollback/i },
  { id: 'plans',          re: /plan|pro|free|team|pricing|upgrade|feature/i },
  { id: 'dns_providers',  re: /(connect|add|setup|how).{0,20}(cloudflare|godaddy|digitalocean|vercel.dns|dns.provider)/i },
  { id: 'servers',        re: /(connect|add|setup|how).{0,20}(server|vps|linux|ubuntu|ssh)/i },
]

function detectIntent(q) {
  for (const p of PATTERNS) {
    if (p.re.test(q)) return { type: 'troubleshoot', id: p.id }
  }
  for (const p of TOPIC_PATTERNS) {
    if (p.re.test(q)) return { type: 'explain', id: p.id }
  }
  return { type: 'unknown' }
}

function generateResponse(question) {
  const intent = detectIntent(question)

  // ── Troubleshooting ───────────────────────────────────────────────────────
  if (intent.type === 'troubleshoot' && KB.troubleshooting[intent.id]) {
    const t = KB.troubleshooting[intent.id]
    return { kind: 'steps', title: t.title, steps: t.steps }
  }

  // ── Topic explanations ────────────────────────────────────────────────────
  if (intent.type === 'explain') {
    switch (intent.id) {
      case 'routes':
        return { kind: 'list', title: 'All SSLVault Pages & Routes', items: KB.routes.map(r => `${r.path}  —  ${r.desc}`) }

      case 'edge_functions':
        return { kind: 'list', title: 'All Supabase Edge Functions', items: KB.edge_functions.map(f => `${f.name}  —  ${f.desc}`) }

      case 'tables':
        return { kind: 'list', title: 'Supabase Database Tables', items: KB.tables.map(t => `${t.name}  —  columns: ${t.cols}`) }

      case 'architecture':
        return {
          kind: 'info', title: 'SSLVault Architecture',
          body: `Stack: ${KB.architecture.stack}\n\nProduction: ${KB.architecture.production}\nSupabase: ${KB.architecture.supabase_project}\nGitHub: ${KB.architecture.github}\nDesign: ${KB.architecture.design}\n\nAuth: ${KB.architecture.auth_note}`,
        }

      case 'auto_renew':
        return { kind: 'info', title: 'Auto-Renewal Logic', body: KB.features.auto_renew }

      case 'vps_agent':
        return { kind: 'info', title: 'VPS Agent', body: KB.features.vps_agent }

      case 'keylocker':
        return { kind: 'info', title: 'KeyLocker / CertVault', body: KB.features.keylocker }

      case 'tls_posture':
        return { kind: 'info', title: 'TLS Posture Check', body: KB.features.tls_posture }

      case 'pqc':
        return { kind: 'info', title: 'Post-Quantum Readiness', body: KB.features.pqc }

      case 'certbind':
        return { kind: 'info', title: 'CertBind', body: KB.features.certbind }

      case 'embed':
        return { kind: 'code', title: 'Embed SSL Badge & Status Page', code: '<script src="https://easysecurity.in/widget.js" data-domain="yourdomain.com" async></script>', note: 'Paste this on your website. It shows a live SSL status badge that updates automatically.\n\nPublic status page: easysecurity.in/status/yourusername — share with clients, no login needed.' }

      case 'deploy':
        return { kind: 'info', title: 'Deploy Process', body: `Flow: ${KB.deploy.flow}\n\nGotcha: ${KB.deploy.build_gotcha}\n\nRollback: ${KB.deploy.rollback}\n\nEnv vars: ${KB.deploy.env_vars}` }

      case 'plans':
        return { kind: 'list', title: 'Plans', items: [`Free — ${KB.plans.free}`, `Pro — ${KB.plans.pro}`, `Team — ${KB.plans.team}`, `Note — ${KB.plans.testing_mode}`] }

      case 'dns_providers': {
        const q = question.toLowerCase()
        const p = q.includes('cloudflare') ? 'cloudflare'
                : q.includes('godaddy') ? 'godaddy'
                : q.includes('digitalocean') ? 'digitalocean'
                : q.includes('vercel') ? 'vercel'
                : null
        if (p) {
          const pv = KB.dns_providers[p]
          return { kind: 'steps', title: `Connect ${p.charAt(0).toUpperCase()+p.slice(1)} DNS`, steps: [`Go to /dns-providers → click "Add DNS + Server"`, `Select ${p} as DNS provider`, `Required fields: ${pv.fields.join(', ')}`, pv.note, `Docs: ${pv.docs}`, `After saving, click Test to verify credentials work`, `Once healthy, DNS-01 challenges run automatically during cert issuance`] }
        }
        return { kind: 'list', title: 'Supported DNS Providers', items: Object.entries(KB.dns_providers).map(([k, v]) => `${k} — Required: ${v.fields[0]}`) }
      }

      case 'servers': {
        const q = question.toLowerCase()
        const t = q.includes('cpanel') ? 'cpanel' : q.includes('plesk') ? 'plesk' : 'ssh'
        const sv = KB.server_types[t]
        return { kind: 'steps', title: `Setup ${sv.desc}`, steps: [`Go to /dns-providers → click "Add DNS + Server"`, `Select "${t}" as server type`, `Fill in: ${sv.fields.join(', ')}`, ...(sv.install ? [`Install agent with: ${sv.install}`] : []), sv.note] }
      }
    }
  }

  // ── Fallback — show help menu ─────────────────────────────────────────────
  return {
    kind: 'menu',
    title: 'Ask me anything about SSLVault',
    sections: [
      { label: 'Troubleshooting', items: ['DNS-01 challenge failing', 'Certificate expired', 'Agent offline', 'cPanel install failing', 'TLS grade low', 'Private key access'] },
      { label: 'How things work', items: ['How auto-renewal works', 'How the VPS agent works', 'How CertVault/KeyLocker works', 'How TLS posture grading works'] },
      { label: 'Setup', items: ['Connect Cloudflare DNS', 'Connect cPanel server', 'Deploy process', 'All app routes', 'All edge functions', 'Database tables'] },
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  RENDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const G = '#10b981'
const DARK = '#0a0a0a'
const SURF = '#111'
const SURF2 = '#1a1a1a'
const BDR = 'rgba(255,255,255,0.07)'
const GBDR = 'rgba(16,185,129,0.22)'
const TXT = '#e8e8e8'
const MUTED = '#777'
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"
const MONO = "'JetBrains Mono','Fira Mono','Menlo',monospace"

function BubbleAI({ children }) {
  return (
    <div style={{ display:'flex', gap:8, alignSelf:'flex-start', maxWidth:'94%', animation:'vbFadeUp 0.18s ease' }}>
      <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:'rgba(16,185,129,0.12)', border:`1px solid rgba(16,185,129,0.28)`, display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, fontSize:9, fontWeight:700, color:G }}>V</div>
      <div style={{ padding:'10px 13px', borderRadius:'12px 12px 12px 3px', background:SURF2, border:`0.5px solid ${BDR}` }}>
        {children}
      </div>
    </div>
  )
}

function BubbleUser({ text }) {
  return (
    <div style={{ display:'flex', gap:8, alignSelf:'flex-end', maxWidth:'88%', flexDirection:'row-reverse', animation:'vbFadeUp 0.18s ease' }}>
      <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:'#1e293b', border:'1px solid rgba(99,179,237,0.25)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, fontSize:9, fontWeight:700, color:'#63b3ed' }}>U</div>
      <div style={{ padding:'9px 12px', borderRadius:'12px 12px 3px 12px', background:'rgba(16,185,129,0.08)', border:'0.5px solid rgba(16,185,129,0.18)', fontSize:13, color:TXT, lineHeight:1.55 }}>{text}</div>
    </div>
  )
}

function RenderResponse({ resp, onChipClick }) {
  if (resp.kind === 'steps') return (
    <div>
      <div style={{ fontSize:11.5, fontWeight:600, color:G, marginBottom:9, letterSpacing:'0.01em' }}>{resp.title}</div>
      {resp.steps.map((s, i) => (
        <div key={i} style={{ display:'flex', gap:7, marginBottom:7, alignItems:'flex-start' }}>
          <div style={{ width:17, height:17, borderRadius:'50%', background:'rgba(16,185,129,0.12)', border:'0.5px solid rgba(16,185,129,0.3)', color:G, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>{i+1}</div>
          <span style={{ fontSize:12, color:TXT, lineHeight:1.65, fontFamily:FONT }}>{s}</span>
        </div>
      ))}
    </div>
  )

  if (resp.kind === 'list') return (
    <div>
      <div style={{ fontSize:11.5, fontWeight:600, color:G, marginBottom:8 }}>{resp.title}</div>
      {resp.items.map((item, i) => {
        const parts = item.split(/\s{2,}—\s{2,}|—/)
        return (
          <div key={i} style={{ display:'flex', gap:0, paddingBottom:5, marginBottom:5, borderBottom:`0.5px solid ${BDR}` }}>
            <span style={{ color:G, marginRight:6, flexShrink:0 }}>›</span>
            <span style={{ fontSize:11.5, color:TXT, lineHeight:1.6 }}>
              {parts[0] && <strong style={{ color:'#c8c8c8', fontFamily:MONO, fontSize:10.5 }}>{parts[0].trim()}</strong>}
              {parts[1] && <span style={{ color:MUTED }}> — {parts[1].trim()}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )

  if (resp.kind === 'code') return (
    <div>
      <div style={{ fontSize:11.5, fontWeight:600, color:G, marginBottom:8 }}>{resp.title}</div>
      <div style={{ background:DARK, borderRadius:7, padding:'10px 13px', fontFamily:MONO, fontSize:11, color:'#a3e635', marginBottom:8, wordBreak:'break-all', lineHeight:1.7, border:`0.5px solid rgba(163,230,53,0.1)` }}>{resp.code}</div>
      {resp.note && <div style={{ fontSize:11.5, color:MUTED, lineHeight:1.65, whiteSpace:'pre-line' }}>{resp.note}</div>}
    </div>
  )

  if (resp.kind === 'info') return (
    <div>
      <div style={{ fontSize:11.5, fontWeight:600, color:G, marginBottom:8 }}>{resp.title}</div>
      <div style={{ fontSize:12, color:TXT, lineHeight:1.75, whiteSpace:'pre-line', fontFamily:FONT }}>{resp.body}</div>
    </div>
  )

  if (resp.kind === 'menu') return (
    <div>
      <div style={{ fontSize:11.5, fontWeight:600, color:G, marginBottom:10 }}>{resp.title}</div>
      {resp.sections.map(sec => (
        <div key={sec.label} style={{ marginBottom:10 }}>
          <div style={{ fontSize:9.5, fontWeight:700, color:MUTED, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{sec.label}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {sec.items.map(item => (
              <button key={item} onClick={() => onChipClick(item)}
                style={{ fontSize:10.5, padding:'4px 9px', borderRadius:14, cursor:'pointer', background:SURF, border:`0.5px solid ${BDR}`, color:MUTED, fontFamily:FONT, transition:'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = GBDR; e.currentTarget.style.color = G }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BDR; e.currentTarget.style.color = MUTED }}>
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  'DNS-01 challenge failing',
  'Agent is offline',
  'Cert expired / not renewing',
  'cPanel install failing',
  'Where is the private key?',
  'How auto-renewal works',
  'All app routes',
  'All edge functions',
]

export default function VaultBrain() {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState([])
  const [showChips, setShowChips] = useState(true)
  const chatRef  = useRef(null)
  const inputRef = useRef(null)

  // Initial greeting
  useEffect(() => {
    setMessages([{
      role: 'ai',
      resp: {
        kind: 'menu',
        title: 'Hey! I\'m VaultBrain — I know every line of this codebase. Ask me anything:',
        sections: [
          { label: 'Common issues', items: ['DNS-01 challenge failing', 'Agent offline', 'Certificate expired', 'cPanel install failing'] },
          { label: 'How things work', items: ['How auto-renewal works', 'How CertVault works', 'How TLS posture grading works'] },
          { label: 'Reference', items: ['All app routes', 'All edge functions', 'Database tables'] },
        ],
      }
    }])
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open && chatRef.current) {
      setTimeout(() => { chatRef.current.scrollTop = chatRef.current.scrollHeight }, 50)
    }
  }, [messages, open])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const ask = useCallback((question) => {
    if (!question.trim()) return
    setShowChips(false)
    const resp = generateResponse(question)
    setMessages(m => [...m, { role: 'user', text: question }, { role: 'ai', resp }])
    setInput('')
  }, [])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) }
  }

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="VaultBrain — SSLVault codebase expert"
        aria-label="Open VaultBrain support agent"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 48, height: 48, borderRadius: '50%',
          background: open ? SURF2 : G,
          border: `1.5px solid ${open ? BDR : G}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 4px 20px rgba(0,0,0,0.5)' : `0 4px 20px rgba(16,185,129,0.45)`,
          transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>
        {open
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        }
      </button>

      {/* ── Pulse ring when closed ──────────────────────────────────── */}
      {!open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          width: 48, height: 48, borderRadius: '50%',
          border: `1.5px solid ${G}`,
          animation: 'vbPulseRing 2.5s ease-out infinite',
          pointerEvents: 'none',
        }}/>
      )}

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 82, right: 24, zIndex: 999,
          width: 390, maxHeight: 580,
          background: DARK, border: `1px solid ${GBDR}`,
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
          animation: 'vbSlideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
          fontFamily: FONT,
        }}>

          {/* Header */}
          <div style={{ background: SURF, borderBottom: `1px solid ${BDR}`, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0', flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: `1.5px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round">
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: G, border: `2px solid ${SURF}` }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TXT, letterSpacing: '-0.01em' }}>VaultBrain</div>
              <div style={{ fontSize: 10, color: G, marginTop: 1 }}>Knows your codebase · zero API · always free</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: `0.5px solid rgba(16,185,129,0.2)`, color: G, letterSpacing: '0.04em' }}>SSLVAULT</div>
          </div>

          {/* Messages area */}
          <div
            ref={chatRef}
            style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}
          >
            {messages.map((msg, i) => (
              msg.role === 'user'
                ? <BubbleUser key={i} text={msg.text}/>
                : <BubbleAI key={i}><RenderResponse resp={msg.resp} onChipClick={ask}/></BubbleAI>
            ))}
          </div>

          {/* Quick chips — shown only initially */}
          {showChips && (
            <div style={{ padding: '0 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
              {QUICK_CHIPS.slice(0, 4).map(c => (
                <button key={c} onClick={() => ask(c)}
                  style={{ fontSize: 10.5, padding: '4px 10px', borderRadius: 14, cursor: 'pointer', background: SURF2, border: `0.5px solid ${BDR}`, color: MUTED, fontFamily: FONT, transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = GBDR; e.currentTarget.style.color = G }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BDR; e.currentTarget.style.color = MUTED }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{ padding: '10px 12px', background: SURF, borderTop: `1px solid ${BDR}`, display: 'flex', gap: 8, alignItems: 'flex-end', borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 88) + 'px' }}
              onKeyDown={handleKey}
              placeholder="Ask anything about SSLVault…"
              rows={1}
              style={{
                flex: 1, background: SURF2, border: `0.5px solid ${BDR}`,
                borderRadius: 8, padding: '9px 12px', color: TXT,
                fontSize: 12.5, fontFamily: FONT, resize: 'none',
                outline: 'none', lineHeight: 1.5, minHeight: 38, maxHeight: 88,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = GBDR}
              onBlur={e => e.target.style.borderColor = BDR}
            />
            <button
              onClick={() => ask(input)}
              disabled={!input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: input.trim() ? G : SURF2,
                border: `0.5px solid ${input.trim() ? G : BDR}`,
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (input.trim()) e.currentTarget.style.background = '#0ea570' }}
              onMouseLeave={e => { if (input.trim()) e.currentTarget.style.background = G }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#000' : MUTED} strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes vbSlideUp {
          from { opacity: 0; transform: translateY(14px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)   scale(1)    }
        }
        @keyframes vbFadeUp {
          from { opacity: 0; transform: translateY(5px) }
          to   { opacity: 1; transform: translateY(0)   }
        }
        @keyframes vbPulseRing {
          0%   { transform: scale(1);   opacity: 0.6 }
          60%  { transform: scale(1.6); opacity: 0   }
          100% { transform: scale(1.6); opacity: 0   }
        }
      `}</style>
    </>
  )
}
