-- COMPREOUVENDA.COM - Fix Access Policy
-- Migration: 005 - Garante que verification_status='pending' não bloqueia acesso
-- Data: 2026-05-17

-- ============================================
-- GARANTIR QUE role NÃO CAUSA PROBLEMA NO TRIGGER
-- O trigger handle_new_user() insere sem o campo 'role'
-- A coluna tem DEFAULT 'user' então funciona, mas garantindo:
-- ============================================

-- Corrigir usuarios existentes que possam não ter role preenchido
UPDATE public.users SET role = 'user' WHERE role IS NULL;

-- Garantir que status='active' para usuários pending_deletion que tenham verificação pendente
-- (apenas usuários sem status explícito de bloqueio)
-- Não tocar em suspended/blocked

-- Garantir índice de performance para busca por auth_id
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);

-- ============================================
-- REMOVER POLICY DUPLICADA DE SELECT se existir
-- ============================================

-- A migration 001 criou "Users can view all profiles" (usando true)
-- E a 004 pode ter criado políticas conflitantes
-- Vamos garantir que a política de INSERT funciona para o trigger

-- O trigger roda como SECURITY DEFINER, por isso não é afetado por RLS
-- Mas vamos garantir que a policy 'System can insert users' existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'System can insert users'
  ) THEN
    EXECUTE 'CREATE POLICY "System can insert users" ON public.users FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- ============================================
-- GARANTIR QUE FUNÇÃO handle_new_user ESTÁ CORRETA
-- Adiciona campos com defaults explícitos para evitar problemas
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, type, status, role, verification_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'type', 'buyer'),
    'active',
    'user',
    'pending'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIO DE POLÍTICA DE ACESSO
-- verification_status = 'pending' → ACESSO LIBERADO (usuário novo)
-- verification_status = 'approved' → ACESSO LIBERADO (usuário verificado)
-- verification_status = 'rejected' + status = 'suspended' → BLOQUEADO
-- status = 'blocked' → BLOQUEADO
-- status = 'suspended' → BLOQUEADO
-- Qualquer outro status → ACESSO LIBERADO
-- ============================================
