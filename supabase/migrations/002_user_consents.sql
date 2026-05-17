-- Migration: 002_user_consents
-- LGPD cookie consent tracking table

CREATE TABLE IF NOT EXISTS public.user_consents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essential     BOOLEAN NOT NULL DEFAULT TRUE,
  analytics     BOOLEAN NOT NULL DEFAULT FALSE,
  marketing     BOOLEAN NOT NULL DEFAULT FALSE,
  version       TEXT NOT NULL DEFAULT 'v1',
  consented_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION public.set_user_consents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_consents_updated_at ON public.user_consents;
CREATE TRIGGER trg_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW EXECUTE FUNCTION public.set_user_consents_updated_at();

-- RLS: users can only read/write their own row
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_consents_select_own" ON public.user_consents;
CREATE POLICY "user_consents_select_own"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_consents_upsert_own" ON public.user_consents;
CREATE POLICY "user_consents_upsert_own"
  ON public.user_consents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);

COMMENT ON TABLE public.user_consents IS 'LGPD cookie consent records per authenticated user.';
COMMENT ON COLUMN public.user_consents.version IS 'Consent text version (e.g. v1). Bump when consent text changes.';
