# compliance-witness (deployed: v3)

Deployed directly to Supabase via management tooling on 2026-06-06.
Authoritative source of truth is the DEPLOYED function (retrieve with
`supabase functions download compliance-witness` or the dashboard).

## Actions (POST, authenticated)
- backfill                — scan certs/renewal_log/certbind/audit_log into the hash-chained witness_events ledger; recompute dossiers
- get_dossier             — account or per-domain dossier(s)
- get_events              — ledger events (limit, optional domain)
- create_share_token      — 90-day read-only auditor share link (/witness?token=)
- get_share_tokens / revoke_share_token
- get_evidence_package    — full report data; registers report hash in `witness_reports` (public verification registry); returns certs status map
- monthly_cron            — for each enabled `witness_schedules` row matching today's day_of_month (max once per calendar month): builds evidence package, creates 90-day share link, emails branded summary via Resend to recipient_emails, updates last_sent_at. Accepts service-role JWT (cron job `witness-monthly-report`, schedule `0 7 1-28 * *`).

## GET (public)
- ?token=...   — auditor share view (access logged)
- ?verify=...  — public report verification: full SHA-256 integrity code or unique 8-char seal-code prefix → {valid, generated_at, stats}

## Env
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, RESEND_API_KEY, FROM_EMAIL (default: SSLVault <notifications@easysecurity.in>)

## Related
- Table `witness_reports` (migration `witness_reports_registry`): package_hash UNIQUE, stats jsonb, RLS select-own; written via service role.
- Frontend: src/pages/ComplianceWitness.jsx (report builder), src/pages/VerifyReport.jsx (/verify page), src/pages/WitnessViewer.jsx (/witness share view).
