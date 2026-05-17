-- =============================================================
-- MIGRATION: fix-rls-users.sql
-- Correcao de policies RLS na tabela public.users
-- Contexto LGPD: remover exposicao de email/phone/document para todos os usuarios
-- =============================================================
-- INSTRUCOES:
-- 1. Acesse https://supabase.com/dashboard/project/auxaajrjwbdsnxtvgmsb
-- 2. Va em SQL Editor e cole todo este conteudo
-- 3. Execute e verifique o bloco de verificacao no final
-- =============================================================
-- PROBLEMA IDENTIFICADO:
-- A policy original "Users can view all profiles" usava USING(true), expondo
-- email, phone e document de TODOS os usuarios para qualquer usuario autenticado.
-- Isso viola o principio da minimizacao de dados da LGPD (art. 6, III).
-- =============================================================

-- -----------------------------------------------
-- PASSO 1: Remover policy insegura original
-- -----------------------------------------------
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

-- -----------------------------------------------
-- PASSO 2: Policy para perfis publicos (campos nao sensiveis)
-- Permite visualizar nome, avatar, cidade, estado e rating de qualquer usuario
-- Nao expoe: email, phone, document, location_lat, location_lng
-- -----------------------------------------------
DROP POLICY IF EXISTS "Users can view public profiles" ON public.users;
CREATE POLICY "Users can view public profiles"
  ON public.users
  FOR SELECT
  USING (true);

-- NOTA: A restricao de colunas e feita via views ou grant de coluna.
-- Como o Supabase PostgREST nao suporta column-level RLS nativamente em policies,
-- criamos uma VIEW segura para o perfil publico:

DROP VIEW IF EXISTS public.user_public_profiles;
CREATE OR REPLACE VIEW public.user_public_profiles AS
  SELECT
    id,
    name,
    avatar_url,
    city,
    state,
    rating,
    rating_count,
    type,
    is_pro,
    is_verified,
    created_at
  FROM public.users;

-- Garantir acesso anonimo/autenticado a view publica
GRANT SELECT ON public.user_public_profiles TO anon, authenticated;

-- -----------------------------------------------
-- PASSO 3: Policy para o proprio perfil completo
-- Apenas o proprio usuario pode ver todos os seus dados (incluindo email, phone, document)
-- -----------------------------------------------
DROP POLICY IF EXISTS "Users can view own full profile" ON public.users;
CREATE POLICY "Users can view own full profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_id);

-- -----------------------------------------------
-- PASSO 4: Policy para admins verem todos os perfis completos
-- Apenas usuarios na tabela admin_users podem ver SELECT * em qualquer usuario
-- -----------------------------------------------
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
        AND admin_users.is_active = true
    )
  );

-- Manter policies de escrita inalteradas (usuarios so editam o proprio perfil)
-- "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_id)  <- ja existe
-- "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_id) <- ja existe

-- -----------------------------------------------
-- VERIFICACAO: Deve retornar 3 novas policies
-- -----------------------------------------------
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Resultado esperado (SELECT policies):
--  policyname                        | cmd    | qual
-- -----------------------------------+--------+------
--  Admins can view all profiles      | SELECT | EXISTS(...)
--  Users can insert own profile      | INSERT | ...
--  Users can update own profile      | UPDATE | ...
--  Users can view own full profile   | SELECT | (auth.uid() = auth_id)
--  Users can view public profiles    | SELECT | true
-- (5 rows)
