-- =============================================
-- Migration 014: Subscriptions + Coupons
-- COMPREOUVENDA.COM
-- =============================================

-- =============================================
-- 1. PLANOS DE ASSINATURA
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id          text PRIMARY KEY,        -- 'basic','pro','business'
  name        text NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly  numeric(10,2) NOT NULL DEFAULT 0,
  features    jsonb NOT NULL DEFAULT '[]',
  highlight   boolean DEFAULT false,
  badge_color text DEFAULT 'purple',
  max_listings integer DEFAULT 10,
  boost_credits integer DEFAULT 0,
  ai_credits   integer DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, features, highlight, badge_color, max_listings, boost_credits, ai_credits) VALUES
('free',    'Gratuito',  0,      0,       '["Até 5 anúncios ativos","Chat com compradores","Suporte por email"]', false, 'gray',   5,  0,  5),
('basic',   'Básico',    19.90,  191.04,  '["Até 20 anúncios ativos","5 destaques por mês","Geração IA de anúncios","Relatórios básicos","Suporte prioritário"]', false, 'blue',   20, 5,  20),
('pro',     'Pro',       49.90,  478.80,  '["Anúncios ilimitados","20 destaques por mês","IA ilimitada","Vídeo automático de produtos","Badge PRO no perfil","Relatórios avançados","Suporte via WhatsApp"]', true, 'purple', -1, 20, -1),
('business','Business',  99.90,  958.80,  '["Tudo do Pro","50 destaques por mês","API de integração","Múltiplos usuários","Gerente de conta dedicado","SLA 99.9%","Relatórios personalizados"]', false, 'orange', -1, 50, -1)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. ASSINATURAS DOS USUÁRIOS
-- =============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     text NOT NULL REFERENCES subscription_plans(id),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','trial','past_due')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end   timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at_period_end boolean DEFAULT false,
  trial_end   timestamptz,
  payment_method text,
  external_subscription_id text,
  boost_credits_remaining integer DEFAULT 0,
  ai_credits_remaining    integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON user_subscriptions(current_period_end);

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_subscription" ON user_subscriptions;
CREATE POLICY "users_own_subscription" ON user_subscriptions
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_all_subscriptions" ON user_subscriptions;
CREATE POLICY "admin_all_subscriptions" ON user_subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 3. CUPONS DE DESCONTO
-- =============================================
CREATE TABLE IF NOT EXISTS coupons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  description text,
  type        text NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage','fixed','free_shipping','boost_credit')),
  value       numeric(10,2) NOT NULL DEFAULT 0,
  min_order_value numeric(10,2) DEFAULT 0,
  max_discount    numeric(10,2),           -- Teto de desconto
  usage_limit     integer,                  -- NULL = ilimitado
  usage_count     integer NOT NULL DEFAULT 0,
  per_user_limit  integer DEFAULT 1,
  valid_from  timestamptz DEFAULT now(),
  valid_until timestamptz,
  applies_to  text DEFAULT 'all' CHECK (applies_to IN ('all','subscription','products','boost')),
  category_id text,
  created_by  uuid REFERENCES users(id),
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active, valid_until);

-- =============================================
-- 4. USO DE CUPONS (histórico)
-- =============================================
CREATE TABLE IF NOT EXISTS coupon_usage (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  uuid NOT NULL REFERENCES coupons(id),
  user_id    uuid NOT NULL REFERENCES users(id),
  order_id   uuid REFERENCES orders(id),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  used_at    timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user   ON coupon_usage(user_id);

-- RLS para coupons (leitura pública, escrita apenas admin)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_coupons" ON coupons;
CREATE POLICY "public_read_coupons" ON coupons FOR SELECT USING (active = true AND (valid_until IS NULL OR valid_until > now()));

DROP POLICY IF EXISTS "admin_manage_coupons" ON coupons;
CREATE POLICY "admin_manage_coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid() AND type = 'admin')
);

-- RLS coupon_usage
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_coupon_usage" ON coupon_usage;
CREATE POLICY "users_own_coupon_usage" ON coupon_usage FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- =============================================
-- 5. FUNÇÃO: validar e aplicar cupom
-- =============================================
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code    text,
  p_user_id uuid,
  p_amount  numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_usage_count integer;
  v_discount numeric := 0;
BEGIN
  SELECT * INTO v_coupon FROM coupons
  WHERE code = UPPER(p_code) AND active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom inválido ou expirado');
  END IF;

  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom esgotado');
  END IF;

  IF v_coupon.min_order_value IS NOT NULL AND p_amount < v_coupon.min_order_value THEN
    RETURN jsonb_build_object('valid', false, 'error',
      'Pedido mínimo de R$ ' || v_coupon.min_order_value::text || ' para este cupom');
  END IF;

  SELECT COUNT(*) INTO v_usage_count FROM coupon_usage
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

  IF v_coupon.per_user_limit IS NOT NULL AND v_usage_count >= v_coupon.per_user_limit THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Você já usou este cupom');
  END IF;

  -- Calcular desconto
  IF v_coupon.type = 'percentage' THEN
    v_discount := ROUND(p_amount * v_coupon.value / 100, 2);
    IF v_coupon.max_discount IS NOT NULL THEN
      v_discount := LEAST(v_discount, v_coupon.max_discount);
    END IF;
  ELSIF v_coupon.type = 'fixed' THEN
    v_discount := LEAST(v_coupon.value, p_amount);
  END IF;

  RETURN jsonb_build_object(
    'valid',          true,
    'coupon_id',      v_coupon.id,
    'code',           v_coupon.code,
    'description',    v_coupon.description,
    'type',           v_coupon.type,
    'discount',       v_discount,
    'final_amount',   GREATEST(0, p_amount - v_discount)
  );
END;
$$;

-- =============================================
-- 6. CUPONS DE EXEMPLO (para dev/demo)
-- =============================================
INSERT INTO coupons (code, description, type, value, min_order_value, usage_limit, valid_until, applies_to) VALUES
('BEMVINDO10', 'Desconto de boas-vindas', 'percentage', 10, 0, 1000, now() + interval '1 year', 'products'),
('PRIMEIRACOMPRA', 'R$20 na primeira compra', 'fixed', 20, 50, 500, now() + interval '6 months', 'products'),
('SOLIDARIO5', 'Desconto em produtos solidários', 'percentage', 5, 0, NULL, NULL, 'all')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 7. COLUNA premium_expires_at em users
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- Índice para verificação de plano
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan, subscription_expires_at);
