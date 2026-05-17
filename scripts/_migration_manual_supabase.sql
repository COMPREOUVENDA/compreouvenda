-- =============================================================
-- MIGRATION CONSOLIDADA - EXECUTAR NO SUPABASE SQL EDITOR
-- Gerado em: 2026-05-15
-- =============================================================
-- INSTRUCOES:
-- 1. Acesse https://supabase.com/dashboard/project/auxaajrjwbdsnxtvgmsb
-- 2. Se o projeto estiver pausado, clique em "Restore project"
-- 3. Va em SQL Editor e cole todo este conteudo
-- 4. Execute e verifique o bloco de verificacao no final
-- =============================================================

-- -----------------------------------------------
-- PARTE 1: supabase/migrations/002_user_consents.sql
-- -----------------------------------------------

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

-- -----------------------------------------------
-- PARTE 2: scripts/create-audit-logs.js (SQL equivalente)
-- -----------------------------------------------

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_email text,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Add missing columns to users table (safe to run even if already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;

-- -----------------------------------------------
-- VERIFICACAO: Deve retornar 3 tabelas + 2 colunas
-- -----------------------------------------------

SELECT 'TABELAS' AS tipo, table_name AS nome
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('audit_logs', 'geo_consents', 'user_consents')

UNION ALL

SELECT 'COLUNA_USERS' AS tipo, column_name AS nome
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('deleted_at', 'deletion_scheduled_at')

ORDER BY tipo, nome;

-- Resultado esperado:
--  tipo         | nome
-- --------------+------------------------
--  COLUNA_USERS | deleted_at
--  COLUNA_USERS | deletion_scheduled_at
--  TABELAS      | audit_logs
--  TABELAS      | geo_consents
--  TABELAS      | user_consents
-- (5 rows = criterio atendido)
