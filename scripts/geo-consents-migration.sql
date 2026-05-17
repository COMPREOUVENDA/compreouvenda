-- ============================================================
-- Migration: geo_consents (LGPD - geolocation consent records)
-- ============================================================
-- Stores ONLY city/state — never raw coordinates.
-- Purpose: LGPD Art. 7 — explicit consent record with purpose.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.geo_consents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city          TEXT        NOT NULL,
  state         TEXT        NOT NULL,
  purpose       TEXT        NOT NULL DEFAULT 'marketplace_proximity_and_donations',
  consented_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups by user
CREATE INDEX IF NOT EXISTS idx_geo_consents_user_id ON public.geo_consents(user_id);

-- RLS: users can only see and modify their own consent records
ALTER TABLE public.geo_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geo_consents: users manage own" ON public.geo_consents
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins (service_role) bypass RLS by default.

-- ============================================================
-- Comment: Purpose limitation (LGPD Art. 6, III)
-- City and state are collected ONLY for:
--   1. Connecting buyers/sellers in the same region
--   2. Routing charitable donations to local institutions
--   3. Reducing transaction fraud via proximity validation
-- Raw GPS coordinates are NEVER stored.
-- ============================================================
