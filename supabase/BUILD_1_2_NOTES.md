# SSLVault — Build History & Session Notes

---

## Session: May 10 2026 — Major redesign + feature sprint

### Design System v2 (fully shipped)
- New design token system in `src/styles/design-v2.css`
- Signature green `#10b981`, solid `#0a0a0a` buttons, no gradients
- All pages migrated: Home, Auth, Dashboard, Generate, Monitor, DnsProviders, Install, KnowledgeBase, About, Developer, Contact
- New brand logo: Option 2 monogram — dark square with bold S + green lock badge (Nav.jsx)

### Pages redesigned
| Page | Changes |
|---|---|
| Home | Full v2 redesign — hero, stats band, features, dark How-it-Works code block, platform chips, footer |
| Auth | Split layout — value prop left, form card right, show/hide password, perks list |
| Dashboard | v2 full redesign — stats bar, filter chips, split list+detail, cert detail panel, AgentInstall in detail panel |
| Generate | 4-step flow, split layout, DNS guide with provider tabs, file download cards |
| Monitor | Removed duplicate issued certs section — now only monitored domains + public scanner |
| About | Extended — mission narrative, Who it's for, How it works, Security practices, Tech stack, Acknowledgements (Let's Encrypt special thanks, CAB Forum, IETF, ISRG, Mozilla, crt.sh) |
| Developer | Split hero with portrait photo, credentials grid, story, skills, other projects |
| Contact | Clean v2, email card, What to Include grid, KB callout |
| Pricing | Full pricing page — Free/Pro/Team cards, annual toggle, feature comparison table, FAQ |
| KeyLocker | Pro vault dashboard — key cards, archive tab, audit log tab, rotation modal, upgrade prompt for free users |

### New features shipped
- **usePlan hook** (`src/hooks/usePlan.js`) — safe plan detection, defaults to free
- **ProGate component** — reusable upgrade prompt for Pro-only features
- **KeyLocker Pro** — full vault UI, rotation flow, audit log
- **Pricing page** — complete with annual/monthly toggle, feature comparison

### Security — Phase 1
- Warning badge on cert rows when private key stored server-side
- "Delete key from servers" button with 3-checkbox interlock
- Privacy Policy updated with honest key storage disclosure
- Full audit document: `SSLVault-Phase1-Security-Audit.md`

### Database migrations run
- `supabase-keylocker-migration.sql` — applied via Supabase MCP
  - `profiles` table (plan, Stripe IDs, seats)
  - `keylocker_keys` table (envelope encryption fields)
  - `keylocker_rotations` table
  - `keylocker_audit_log` table (append-only RLS)
  - Auto-create profile trigger on user signup

### Edge functions updated
- `scan-ssl` v11→v13 — multiple strategy attempts (live TLS blocked by Supabase network)
  - **Known issue:** Supabase edge functions cannot make raw TCP connections
  - **Fix in progress:** Cloudflare Worker ssl-checker (Worker code written, pending deployment)

### Bug fixes
- Dashboard cert row click blocked by `stopPropagation` on wrapper div — fixed
- `isPro` undefined crash in CertDetail — fixed (prop not passed down)
- Install button moved from cert row → cert detail panel
- Home page duplicate "Issue Certificate" CTA — removed
- About page duplicate "Issue Certificate" CTA — removed
- Dashboard duplicate sign-in CTAs in marketing view — removed

---

## Earlier builds (pre May 10 2026)

### Build 1: Auto-Renewal Engine
- `auto-renew-cron` edge function deployed
- Renewal Schedule tab in Dashboard
- Discovery tab (CT logs via crt.sh)

### Build 2: Discovery
- CT Logs + Connect DNS + Scan a Server modes
- `server_scan_results`, `dns_scan_results` tables
- `scan-ssl`, `dns-provider`, `agent-daemon` edge functions

### Persistent Agent
- `sslvault-agent.sh` bash daemon (systemd, polls every 5 min)
- `sslvault-agent.php` PHP/cPanel agent
- `agent-install.sh` one-command installer
- DB: `persistent_agents` + `agent_jobs` tables
- Edge fn: `agent-daemon` v4

---

## Pending / Next sprint

1. **Cloudflare Worker** — deploy `ssl-checker` Worker for accurate live SSL scanning
2. **Payment provider** — integrate Razorpay or alternative for KeyLocker Pro
3. **Stripe webhook handler** — `stripe-webhook` edge function for auto plan upgrades
4. **keylocker-rotate edge function** — actual key rotation backend
5. **Email alerts** — Resend integration for expiry warnings (threshold stored, emails not sent yet)
6. **Auto-scan cron** — periodic bulk scan of monitored domains

---

## Rollback commands

```bash
# List recent deployments
vercel list --scope bOUWIT8dmfwi4CPGcRqt7Oq1

# Promote a previous deployment to production
vercel promote <deployment-url> --scope bOUWIT8dmfwi4CPGcRqt7Oq1
```
