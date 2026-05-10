# SSLVault — Certificate Lifecycle Management Platform

**Live:** https://easysecurity.in  
**Author:** Mathivanan Kathirvel (Spartan)  
**Role:** Certified PKI Specialist & Partner Account Manager, DigiCert  
**Stack:** React 18 + Vite · Supabase · Vercel · Let's Encrypt ACME  
**GitHub:** mathimcafee-dev/LetsEncrypt  
**Supabase project:** `frthcwkntciaakqsppss`  
**Vercel project:** `prj_RbtRZ3pm5TIz1nGFN9zsMNGXVdCB`  
**Last updated:** May 10, 2026

---

## What SSLVault Does

SSLVault is a passion project by Mathivanan Kathirvel — a free, open certificate lifecycle management platform built on Let's Encrypt. Designed to give indie developers, small businesses, and non-profits the same SSL management tools that enterprise teams enjoy, without the enterprise price tag.

Issue, install, monitor, and auto-renew TLS certificates with zero cost and zero friction.

---

## Architecture

```
Browser (React 18 + Vite)
    ↓
Vercel Edge (CDN + hosting)
    ↓
Supabase (PostgreSQL + RLS + Edge Functions)
    ↓
Let's Encrypt ACME (certificate issuance)
    ↓
VPS Agent (bash daemon, polling every 5 min)
```

---

## Project Structure

```
src/
├── pages/
│   ├── Home.jsx          # Landing page
│   ├── Auth.jsx          # Sign in / Sign up
│   ├── Dashboard.jsx     # Certificate inventory (logged-in + marketing)
│   ├── Generate.jsx      # Issue certificates (4-step ACME flow)
│   ├── Monitor.jsx       # SSL Monitor (external domains + public scanner)
│   ├── DnsProviders.jsx  # DNS provider management
│   ├── Install.jsx       # Install guide (Nginx, Apache, cPanel)
│   ├── KnowledgeBase.jsx # Docs and guides
│   ├── KeyLocker.jsx     # Pro: encrypted key vault
│   ├── Pricing.jsx       # KeyLocker Pro/Team pricing
│   ├── About.jsx         # About SSLVault
│   ├── Developer.jsx     # About Mathi
│   ├── Contact.jsx       # Contact page
│   ├── Privacy.jsx       # Privacy policy
│   └── Terms.jsx         # Terms of service
├── components/
│   ├── Nav.jsx           # Navigation (logo, links, user menu)
│   ├── AgentInstall.jsx  # Agent install modal (VPS + cPanel flows)
│   └── ProGate.jsx       # Pro plan upgrade prompt
├── hooks/
│   ├── useAuth.js        # Supabase auth state
│   └── usePlan.js        # User plan (free/pro/team)
├── lib/
│   └── supabase.js       # Supabase client
├── styles/
│   └── design-v2.css     # v2 design system tokens
└── App.jsx               # Page router
```

---

## Design System (v2)

All pages use the v2 design system defined in `src/styles/design-v2.css`.

**Key tokens:**
- Signature green: `#10b981` (`--v2-green`)
- Dark button: `#0a0a0a`
- Background: `--v2-bg` (near-white)
- No gradients, no emoji in UI, all Lucide icons
- Solid `#0a0a0a` buttons, green accents

**Brand logo:** Monogram mark — dark `#0a0a0a` square with bold green S + green lock badge (bottom-right). Wordmark: SSL in dark, Vault in green.

**Components:** `v2-card`, `v2-btn`, `v2-btn-primary`, `v2-input`, `v2-stat`, `v2-list-row`, `v2-detail`, `v2-callout`, `v2-modal`, `v2-filter-chip`, `v2-status`, `v2-mono`

---

## Database Tables

### Core
| Table | Purpose |
|---|---|
| `certificates` | Issued SSL certs (cert_pem, private_key_pem, domain, user_id) |
| `ssl_orders` | ACME order sessions |
| `monitored_domains` | External domains tracked by SSL Monitor |
| `persistent_agents` | Registered VPS agents |
| `agent_jobs` | Jobs dispatched to agents (install, scan, renew) |
| `server_scan_results` | Results from CT log discovery |
| `dns_scan_results` | DNS-based discovery results |

### Security & Billing (KeyLocker)
| Table | Purpose |
|---|---|
| `profiles` | User plan (free/pro/team), Stripe IDs, plan expiry |
| `keylocker_keys` | Encrypted private key vault (envelope encryption) |
| `keylocker_rotations` | Key rotation history |
| `keylocker_audit_log` | Append-only audit log (no user write via RLS) |

---

## Edge Functions

| Function | Purpose |
|---|---|
| `acme-ssl` | ACME certificate issuance (start/verify/finalize) |
| `agent-daemon` | Job dispatch + agent polling handler |
| `agent` | One-time token issuance for PHP/cPanel agent |
| `scan-ssl` | SSL certificate scanning (CT log strategy) |
| `dns-provider` | DNS provider integration (Cloudflare, Vercel, GoDaddy) |
| `server-credentials` | Encrypted server credential storage |
| `auto-renew-cron` | Scheduled certificate renewal |

---

## Agent Files

| File | Purpose |
|---|---|
| `public/sslvault-agent.sh` | Bash daemon for VPS (polls every 5 min via systemd) |
| `public/sslvault-agent.php` | PHP agent for cPanel/shared hosting |
| `public/agent-install.sh` | One-command agent installer |

---

## Security — Phase 1

Per CAB Forum BR §6.1.2 review, Phase 1 security improvements shipped May 10, 2026:

- **Warning badge** on Dashboard cert rows when `private_key_pem` is stored server-side
- **"Delete key from servers"** button in cert detail panel with 3-checkbox interlock
- **Interlock warning** if no agent install recorded before deletion
- **Privacy Policy** updated with honest key storage disclosure
- **Phase 2** (envelope encryption at rest) planned for future sprint

See `SSLVault-Phase1-Security-Audit.md` for the full workflow documentation.

---

## KeyLocker Pro

Pro tier featuring encrypted key vault:

- **Envelope encryption:** AES-256-GCM per cert, DEK wrapped with per-user KEK
- **Key rotation:** Zero-downtime rotation with 30-day archive
- **Immutable audit log:** Append-only via RLS policy
- **Email alerts:** Via Resend on key access

**Pricing:**
- Pro: $9.99/mo or $79/yr
- Team: $29.99/mo or $229/yr

**Status:** UI complete, Supabase tables live. Payment provider integration pending.

**Supabase migration:** `supabase-keylocker-migration.sql` — already applied May 10, 2026.

---

## Known Issues / Pending

| Item | Status |
|---|---|
| SSL Monitor scan accuracy | Supabase edge functions cannot do raw TLS connections. Cloudflare Worker fix in progress — Worker code ready, pending Spartan deploying to Cloudflare account |
| Payment provider | Exploring options (Stripe India invite-only, Razorpay international pending approval) |
| Auto-scan cron | `monitored_domains` only scanned manually. No automatic periodic scan yet |
| Email alerts on expiry | `alert_threshold_days` stored but no email triggered yet |
| KeyLocker rotate edge fn | `keylocker-rotate` Supabase edge function not yet written |

---

## Rollback Targets

| Commit | Description |
|---|---|
| `3e8315e` | Current production HEAD |
| `1626169` | Monitor cleaned up |
| `f745443` | Phase 1 security |
| `8ae0564` | Auth v2 |
| `2781251` | Generate v2 |
| `212bcf2` | Last known good before v2 redesign |

---

## Environment Variables (Vercel)

```
VITE_SUPABASE_URL=https://frthcwkntciaakqsppss.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## Deploy Hook

```
https://api.vercel.com/v1/integrations/deploy/prj_Hltac0t3bDsuRQhPJh9H009996nm/ju9bsxV4tH
```

---

## Development

```bash
npm install
npm run dev      # localhost:5173
npm run build    # production build
```

---

*SSLVault is a personal project by Mathivanan Kathirvel (Spartan)*  
*Certified PKI Specialist · Partner Account Manager APAC, DigiCert*  
*Built with passion for open PKI and free encryption for everyone.*
