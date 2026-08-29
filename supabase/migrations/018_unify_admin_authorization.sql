-- ============================================================================
-- 018 — Unificação da autorização administrativa
--
-- O projeto mantinha DOIS mecanismos concorrentes e dessincronizados:
--   * `public.users.role IN ('admin','super_admin')` — usado pelo painel
--   * `public.admin_users`                          — usado pelas APIs
--
-- Consequências observadas em produção:
--   * contas admin no painel recebiam 403 nas rotas de escrow;
--   * `is_active` (revogação de acesso) era ignorado em metade do sistema;
--   * papéis granulares de `admin_users` não tinham efeito no painel.
--
-- A partir daqui `public.admin_users` é a ÚNICA fonte de verdade. Esta migration
-- promove para `admin_users` todo mundo que já era admin pelo campo legado,
-- de modo que ninguém perca acesso durante a transição.
-- ============================================================================

-- 1. Migra os admins que só existiam em users.role
INSERT INTO public.admin_users (auth_id, email, name, role, is_active)
SELECT
  u.auth_id,
  u.email,
  COALESCE(u.name, split_part(u.email, '@', 1)),
  CASE WHEN u.role = 'super_admin' THEN 'super_admin' ELSE 'admin_operational' END,
  true
FROM public.users u
WHERE u.role IN ('admin', 'super_admin')
  AND u.auth_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_users a WHERE a.auth_id = u.auth_id
  );

-- 2. Mantém users.role coerente para os admins já existentes em admin_users.
--    O campo permanece apenas como rótulo informativo (badges na listagem de
--    usuários); nenhuma decisão de autorização deve mais consultá-lo.
UPDATE public.users u
SET role = CASE WHEN a.role = 'super_admin' THEN 'super_admin' ELSE 'admin' END
FROM public.admin_users a
WHERE a.auth_id = u.auth_id
  AND a.is_active = true
  AND COALESCE(u.role, 'user') NOT IN ('admin', 'super_admin');

-- 3. Rebaixa no rótulo quem teve o acesso revogado em admin_users,
--    evitando badge "ADMIN" para conta sem privilégio real.
UPDATE public.users u
SET role = 'user'
FROM public.admin_users a
WHERE a.auth_id = u.auth_id
  AND a.is_active = false
  AND u.role IN ('admin', 'super_admin');

-- 4. Índice para o lookup de autorização (auth_id + is_active), executado em
--    toda requisição administrativa.
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_active
  ON public.admin_users (auth_id) WHERE is_active = true;

COMMENT ON TABLE public.admin_users IS
  'Fonte única de verdade para privilégio administrativo. users.role é apenas rótulo informativo.';
