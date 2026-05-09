-- Build 1 (Auto-Renewal) + Build 2 (Discovery) schema migration
-- Run this in Supabase SQL editor for the SSLVault / freeencryption project.
-- Project ref: frthcwkntciaakqsppss

-- =============================================
-- 1. Extend `certificates` for auto-renewal
-- =============================================

alter table public.certificates
  add column if not exists auto_renew_enabled boolean default true not null,
  add column if not exists auto_renew_attempt_count integer default 0 not null,
  add column if not exists last_renewal_attempt_at timestamptz,
  add column if not exists last_renewal_status text,
  add column if not exists last_renewal_error text,
  add column if not exists dns_provider_id uuid,
  add column if not exists discovered_via text,
  add column if not exists external_issuer text;

comment on column public.certificates.auto_renew_enabled is 'Master switch for whether the auto-renew cron should touch this cert.';
comment on column public.certificates.auto_renew_attempt_count is 'Number of consecutive failed renewal attempts (resets on success). Used for exponential backoff.';
comment on column public.certificates.last_renewal_status is 'success | failed | null';
comment on column public.certificates.dns_provider_id is 'Which DNS provider record to use for the DNS-01 challenge during auto-renewal.';
comment on column public.certificates.discovered_via is 'How this cert entered the system: manual | dns_discovery | ct_logs | agent_scan';
comment on column public.certificates.external_issuer is 'For discovered certs not yet under our renewal: the original issuer (Let''s Encrypt | Sectigo | DigiCert | etc).';

-- =============================================
-- 2. Renewal events log
-- =============================================

create table if not exists public.renewal_events (
  id uuid primary key default gen_random_uuid(),
  cert_id uuid references public.certificates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  created_at timestamptz default now() not null,
  details jsonb default '{}'::jsonb not null
);

create index if not exists renewal_events_user_id_idx on public.renewal_events (user_id, created_at desc);
create index if not exists renewal_events_cert_id_idx on public.renewal_events (cert_id, created_at desc);

alter table public.renewal_events enable row level security;

drop policy if exists "users read own renewal events" on public.renewal_events;
create policy "users read own renewal events"
  on public.renewal_events for select
  using (auth.uid() = user_id);

-- Inserts only via service role (the cron edge function); no direct user inserts.

comment on table public.renewal_events is 'Append-only log of all auto-renewal lifecycle events. Powers the Renewal Schedule UI and the activity feed.';
comment on column public.renewal_events.event_type is 'renewal_scheduled | renewal_started | renewal_succeeded | renewal_failed | cert_imported | cert_discovered | auto_renew_enabled | auto_renew_disabled';

-- =============================================
-- 3. Discovery runs (Build 2)
-- =============================================

create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  method text not null,
  status text default 'running' not null,
  created_at timestamptz default now() not null,
  finished_at timestamptz,
  domains_found integer default 0 not null,
  domains_imported integer default 0 not null,
  details jsonb default '{}'::jsonb not null
);

create index if not exists discovery_runs_user_id_idx on public.discovery_runs (user_id, created_at desc);

alter table public.discovery_runs enable row level security;

drop policy if exists "users read own discovery runs" on public.discovery_runs;
create policy "users read own discovery runs"
  on public.discovery_runs for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own discovery runs" on public.discovery_runs;
create policy "users insert own discovery runs"
  on public.discovery_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own discovery runs" on public.discovery_runs;
create policy "users update own discovery runs"
  on public.discovery_runs for update
  using (auth.uid() = user_id);

comment on table public.discovery_runs is 'One row per discovery scan kicked off by a user (DNS, CT logs, or agent-based).';
comment on column public.discovery_runs.method is 'dns | ct_logs | agent';
comment on column public.discovery_runs.status is 'running | succeeded | failed | partial';

-- =============================================
-- 4. Helper view for the dashboard "Renewal Schedule" tab
-- =============================================

create or replace view public.upcoming_renewals as
select
  c.id as cert_id,
  c.user_id,
  c.domain,
  c.expires_at,
  c.auto_renew_enabled,
  c.dns_provider_id,
  c.last_renewal_status,
  c.last_renewal_attempt_at,
  c.auto_renew_attempt_count,
  greatest(0, extract(day from c.expires_at - now())::integer) as days_until_expiry,
  case
    when c.auto_renew_enabled = false then 'paused'
    when c.dns_provider_id is null then 'needs_dns'
    when c.expires_at < now() then 'expired'
    when c.expires_at < now() + interval '14 days' then 'due_soon'
    when c.last_renewal_status = 'failed' then 'failed'
    else 'scheduled'
  end as renewal_state
from public.certificates c
where c.status = 'active';

comment on view public.upcoming_renewals is 'Computed view powering the Renewal Schedule dashboard. Joins certificate state with derived renewal status.';

-- =============================================
-- 5. Backfill: enable auto-renew for existing certs by default
-- =============================================
-- New certs default to auto_renew_enabled = true (column default).
-- For existing rows, opt them in too — but they will only auto-renew
-- if they have a dns_provider_id linked.
-- This is safe because the cron skips certs without a DNS provider.

update public.certificates
set auto_renew_enabled = true
where auto_renew_enabled is null;

-- =============================================
-- Done.
-- =============================================
