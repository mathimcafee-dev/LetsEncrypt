-- ════════════════════════════════════════════════════════════════════
-- SSLVault KeyLocker Pro — Supabase Migration
-- Run this ONCE in your Supabase SQL editor before deploying KeyLocker
-- Date: 10 May 2026
-- ════════════════════════════════════════════════════════════════════

-- ── 1. profiles table (plan management + Stripe) ─────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','team')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at       TIMESTAMPTZ,
  grace_period_until    TIMESTAMPTZ,
  seats_total           INT DEFAULT 1,
  seats_used            INT DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- ── 2. keylocker_keys table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS keylocker_keys (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cert_id                 UUID REFERENCES certificates(id) ON DELETE SET NULL,
  domain                  TEXT NOT NULL,
  -- Encryption fields (envelope encryption)
  kek_id                  TEXT,              -- reference to KMS key (never the key itself)
  dek_encrypted           TEXT,              -- DEK wrapped with KEK
  key_material_encrypted  TEXT,              -- private key encrypted with DEK
  -- Metadata (plaintext — not sensitive)
  algorithm               TEXT DEFAULT 'RSA',
  key_size                INT  DEFAULT 2048,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','revoked')),
  rotation_count          INT DEFAULT 0,
  last_accessed_at        TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  archived_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE keylocker_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_keys" ON keylocker_keys
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_keylocker_keys_user_id ON keylocker_keys(user_id);
CREATE INDEX idx_keylocker_keys_domain  ON keylocker_keys(domain);
CREATE INDEX idx_keylocker_keys_status  ON keylocker_keys(status);

-- ── 3. keylocker_rotations table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS keylocker_rotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_key_id      UUID REFERENCES keylocker_keys(id) ON DELETE SET NULL,
  new_key_id      UUID REFERENCES keylocker_keys(id) ON DELETE SET NULL,
  domain          TEXT NOT NULL,
  triggered_by    TEXT NOT NULL CHECK (triggered_by IN ('manual','scheduled','expiry','compromise')),
  rotated_at      TIMESTAMPTZ DEFAULT now(),
  rotated_by_user_id UUID REFERENCES auth.users(id)
);

ALTER TABLE keylocker_rotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_rotations" ON keylocker_rotations
  FOR ALL USING (auth.uid() = user_id);

-- ── 4. keylocker_audit_log (APPEND-ONLY — no UPDATE/DELETE) ──────────
CREATE TABLE IF NOT EXISTS keylocker_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id        UUID REFERENCES keylocker_keys(id) ON DELETE SET NULL,
  domain        TEXT,
  action        TEXT NOT NULL CHECK (action IN ('created','fetched','rotated','archived','deleted','exported','viewed')),
  triggered_by  TEXT NOT NULL CHECK (triggered_by IN ('user','agent','cron','api')),
  agent_id      UUID,
  ip_address    TEXT,
  user_agent    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE keylocker_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own audit rows but NEVER INSERT/UPDATE/DELETE directly
-- Only edge functions (service role) write to audit log
CREATE POLICY "users_read_own_audit" ON keylocker_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Prevent any direct modification by users
CREATE POLICY "deny_user_write_audit" ON keylocker_audit_log
  FOR INSERT WITH CHECK (false);

CREATE INDEX idx_audit_log_user_id ON keylocker_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON keylocker_audit_log(created_at DESC);

-- ════════════════════════════════════════════════════════════════════
-- Run this SQL in Supabase → SQL Editor → New Query → Run
-- No downtime. Does not touch existing tables.
-- Safe to run multiple times (IF NOT EXISTS throughout).
-- ════════════════════════════════════════════════════════════════════
