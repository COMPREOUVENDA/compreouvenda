-- Migration 017: Corrige privilégios do service_role
--
-- PROBLEMA: O papel `service_role` perdeu os privilégios básicos de DML em todas
-- as tabelas do schema public, mantendo apenas REFERENCES, TRIGGER e TRUNCATE.
-- Isso fazia com que qualquer rota de API server-side usando a SERVICE_ROLE_KEY
-- recebesse "permission denied for table X", quebrando webhooks de pagamento,
-- escrow, criação de pedidos e notificações.
--
-- SOLUÇÃO: Restaura os privilégios padrão do Supabase para service_role, anon e
-- authenticated, e define privilégios padrão para tabelas criadas no futuro.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Uso do schema
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. service_role: acesso total (é o papel usado pelas rotas server-side e
--    bypassa RLS por padrão no Supabase)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. authenticated: DML completo (a autorização real é feita pelas RLS policies)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. anon: somente leitura (RLS restringe quais linhas ficam visíveis)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Privilégios padrão para objetos criados no futuro
-- ─────────────────────────────────────────────────────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
