# SSLVault — Build History & Development Notes

**Author:** Mathivanan Kathirvel (Spartan)  
**Project:** SSLVault — https://easysecurity.in  
**Last updated:** May 10, 2026

---

## Session: May 10, 2026 — Full v2 redesign + features

### Design System v2
- Created `src/styles/design-v2.css` with full token system
- Signature green `#10b981`, solid `#0a0a0a` buttons, no pastel gradients
- All pages migrated to v2 design language
- New SSLVault brand logo: dark square monogram S with green lock badge

### Pages redesigned (v2)
| Page | Key changes |
|---|---|
| Home | v2 hero, stats band, dark How-it-Works terminal block, footer |
| Auth | Split layout — value prop + form card, show/hide password |
| Dashboard | Stats bar, filter chips, split list+detail, Install in detail panel |
| Generate | 4-step ACME flow, DNS guide tabs, file download cards |
| Monitor | Removed duplicate issued certs — monitored domains only |
| About | Mission expanded, acknowledgements section (Let's Encrypt, CAB Forum, IETF, ISRG, Mozilla, crt.sh) |
| Developer | Portrait hero, credentials, story, skills, projects |
| Contact | Email card, What to Include grid |
| Pricing | Free/Pro/Team cards, annual toggle, feature table, FAQ |
| KeyLocker | Pro vault — key cards, archive, audit log, rotation modal |

### New features
- `usePlan` hook — plan detection, safe defaults to free
- `ProGate` component — reusable Pro upgrade prompt
- KeyLocker Pro vault UI — full dashboard with tabs
- Pricing page — complete billing UI
- Phase 1 security — key storage warning + delete flow

### Database migrations applied
Ran via Supabase MCP on May 10, 2026:
- `profiles` — plan, Stripe fields, seats
- `keylocker_keys` — encrypted vault storage
- `keylocker_rotations` — rotation history
- `keylocker_audit_log` — append-only audit (RLS enforced)
- Auto-create profile trigger on signup

### Edge functions updated
- `scan-ssl` v11 → v13 — multiple scan strategies
  - Note: Supabase network blocks raw TCP — live TLS scan fails
  - Cloudflare Worker solution written, pending deployment

### Bug fixes
- Dashboard cert row click blocked by stopPropagation — fixed
- `isPro` undefined crash in CertDetail — fixed
- Install button moved from row → detail panel
- Duplicate CTAs removed (Home, About, Dashboard)
- Monitor blank page — removed dangling cert references

### Documentation
- README.md — full rewrite
- BUILD_1_2_NOTES.md — this file, updated
- SSLVault-Phase1-Security-Audit.md — security workflow document

---

## Pending (next sprint)

| Item | Notes |
|---|---|
| Cloudflare Worker ssl-checker | Worker code ready. Spartan to deploy at dash.cloudflare.com, paste URL for wiring |
| Payment provider | Stripe India invite-only. Exploring Razorpay international |
| keylocker-rotate edge fn | Backend rotation logic not yet written |
| Email alerts | Resend wired but expiry alert emails not triggered |
| Auto-scan cron | Manual scan only right now |

---

## Earlier builds

### Build 1 — Auto-Renewal Engine
- `auto-renew-cron` edge function
- Renewal Schedule tab
- pg_cron setup instructions (see below)

### Build 2 — Discovery
- CT Logs + Connect DNS + Scan a Server
- `server_scan_results`, `dns_scan_results` tables
- `scan-ssl`, `dns-provider` edge functions

### Persistent Agent
- `sslvault-agent.sh` — systemd daemon, polls every 5 min
- `sslvault-agent.php` — cPanel/shared hosting
- `agent-install.sh` — one-command installer

---

## Cron setup (pending)

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'auto-renew-daily',
  '0 3 * * *',
  $$
    select net.http_post(
      url := 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/auto-renew-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    );
  $$
);
```

---

## Rollback

```bash
# Vercel instant rollback
# 1. list_deployments for projectId prj_RbtRZ3pm5TIz1nGFN9zsMNGXVdCB
# 2. promote previous deployment URL to production
```

Key rollback commits:
- `3e8315e` — current HEAD
- `212bcf2` — pre-v2 safe point
