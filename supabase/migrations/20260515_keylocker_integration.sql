-- ════════════════════════════════════════════════════════════════════
-- SSLVault KeyLocker Integration Migration
-- Date: 15 May 2026
-- Purpose: Link ssl_orders + certificates to keylocker_keys vault.
--          Remove private_key_pem from plain storage tables.
-- ════════════════════════════════════════════════════════════════════

-- 1. Add keylocker_key_id reference to ssl_orders
ALTER TABLE public.ssl_orders
  ADD COLUMN IF NOT EXISTS keylocker_key_id UUID REFERENCES public.keylocker_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ssl_orders_keylocker_key_id
  ON public.ssl_orders(keylocker_key_id);

-- 2. Add keylocker_key_id reference to certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS keylocker_key_id UUID REFERENCES public.keylocker_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_certificates_keylocker_key_id
  ON public.certificates(keylocker_key_id);

-- 3. Migrate any existing plaintext private keys into KeyLocker.
--    (Edge function handles this; migration just notes the intent.)
--    After migration is confirmed, the columns below can be nulled out.
--    We keep them for now to avoid breaking existing installs.
--
-- IMPORTANT: Run the following only AFTER running the backfill script:
--   UPDATE public.ssl_orders  SET private_key_pem = NULL WHERE keylocker_key_id IS NOT NULL;
--   UPDATE public.certificates SET private_key_pem = NULL WHERE keylocker_key_id IS NOT NULL;

-- 4. Add csr_identity metadata columns to keylocker_keys for audit clarity
ALTER TABLE public.keylocker_keys
  ADD COLUMN IF NOT EXISTS ggs_order_id     BIGINT,
  ADD COLUMN IF NOT EXISTS order_id         UUID,
  ADD COLUMN IF NOT EXISTS csr_fingerprint  TEXT,
  ADD COLUMN IF NOT EXISTS product_name     TEXT;

COMMENT ON COLUMN public.keylocker_keys.ggs_order_id    IS 'GoGetSSL order ID — links vault entry to the CA order';
COMMENT ON COLUMN public.keylocker_keys.order_id        IS 'Internal ssl_orders.id reference';
COMMENT ON COLUMN public.keylocker_keys.csr_fingerprint IS 'SHA-256 fingerprint of the CSR submitted to CA (public material only)';
COMMENT ON COLUMN public.keylocker_keys.product_name    IS 'Product name e.g. RapidSSL DV';

-- 5. Security note: keylocker_keys.key_material_encrypted and
--    keylocker_keys.dek_encrypted contain only ciphertext.
--    The KEK is derived at runtime from KEYLOCKER_MASTER_SECRET (Supabase secret).
--    A database dump alone cannot decrypt any private key.

-- ════════════════════════════════════════════════════════════════════
-- Run in Supabase → SQL Editor. Safe to run multiple times.
-- ════════════════════════════════════════════════════════════════════
