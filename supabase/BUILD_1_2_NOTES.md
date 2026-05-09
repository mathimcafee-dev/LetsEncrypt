# Build 1 + Build 2 — Status Notes

This branch ships:
- **Build 1: Auto-Renewal Engine** — Supabase edge function + 4-stat header + new "Renewal Schedule" tab + activity log
- **Build 2: Discovery (CT-logs surface)** — new "Discovery" tab + crt.sh integration + import-to-monitor flow

## What's already done

### Database (Supabase SQL editor)
✅ Schema migration applied: new columns on `certificates`, new tables `renewal_events` and `discovery_runs`, new view `upcoming_renewals`.

### Edge Function
✅ `auto-renew-cron` deployed.
✅ Custom secret `ACME_FUNCTION_URL` set.
⚠️ **Verify JWT toggle** — should be OFF (the function authenticates the cron caller via service role key in the Authorization header). Spartan: please double-check this is OFF in Settings → Function Configuration. If it's ON, the cron will get 401s.

### Frontend (this branch)
✅ Dashboard.jsx now has 5 stat cards (added Auto-renewing in green)
✅ Tab bar between stats and inventory: Inventory · Renewal Schedule · Discovery
✅ Renewal Schedule view shows upcoming 30-day window + activity log
✅ Discovery view scans crt.sh and imports findings into `monitored_domains`

## What's left to do (later, not blocking preview)

### 1. Schedule the cron (5 min, SQL editor)
The auto-renew function exists but nothing is calling it daily. Quickest setup is via SQL — run this once in the SQL editor:

```sql
-- Enable pg_cron if not already (likely already enabled on Supabase)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule daily at 03:00 UTC
select cron.schedule(
  'auto-renew-daily',
  '0 3 * * *',
  $$
    select net.http_post(
      url := 'https://frthcwkntciaakqsppss.supabase.co/functions/v1/auto-renew-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      )
    ) as request_id;
  $$
);
```

If `vault.decrypted_secrets` doesn't have `service_role_key`, hardcode the service role key inline (it's in Project Settings → API → service_role).

### 2. Test the cron manually first
Before scheduling, invoke once to make sure it works:

```bash
curl -X POST https://frthcwkntciaakqsppss.supabase.co/functions/v1/auto-renew-cron \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Should return a JSON summary like:
```json
{ "started_at":"...", "total_candidates":0, "renewed":0, "failed":0, ... }
```

### 3. Build 2 enhancements (deferred until traction)
- Connect-DNS surface (uses `dns_credentials` table that already exists)
- Agent-based local discovery (--discover flag on the install agent)
- Bulk-import button after a successful CT scan (instead of one-by-one)

These were intentionally cut from MVP per Spartan's "stop until traction" direction.
