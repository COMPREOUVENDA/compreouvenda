-- COMPREOUVENDA.COM - Criar trigger para inserir perfil automaticamente
-- Migration: 017

-- Garante que a função handle_new_user existe e está correta
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'type', 'buyer')
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger existente para recriar de forma idempotente
DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;

-- Cria trigger para inserir perfil público quando um usuário é criado no Auth
CREATE TRIGGER trg_auth_users_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
