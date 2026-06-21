-- Migration 011: Anúncios em destaque + estatísticas de vendedor
-- Executar em: db.auxaajrjwbdsnxtvgmsb.supabase.co

-- =============================================
-- 1. TABELA: featured_products (anúncios patrocinados)
-- =============================================
CREATE TABLE IF NOT EXISTS featured_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'premium', 'ultra')),
  -- basic = destaque na lista | premium = + banner rotativo | ultra = + topo de categoria
  starts_at     timestamptz NOT NULL DEFAULT now(),
  ends_at       timestamptz NOT NULL,
  price_paid    numeric(10,2) NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  impressions   integer NOT NULL DEFAULT 0,
  clicks        integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_featured_products_product ON featured_products(product_id);
CREATE INDEX IF NOT EXISTS idx_featured_products_user    ON featured_products(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_products_active  ON featured_products(status, ends_at);

-- RLS
ALTER TABLE featured_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios destaques"
  ON featured_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins veem todos os destaques"
  ON featured_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 2. TABELA: seller_stats (cache de estatísticas do vendedor)
-- =============================================
CREATE TABLE IF NOT EXISTS seller_stats (
  user_id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_products  integer NOT NULL DEFAULT 0,
  total_sold      integer NOT NULL DEFAULT 0,
  total_revenue   numeric(12,2) NOT NULL DEFAULT 0,
  total_donated   numeric(12,2) NOT NULL DEFAULT 0,
  avg_rating      numeric(3,2) NOT NULL DEFAULT 0,
  total_reviews   integer NOT NULL DEFAULT 0,
  response_rate   numeric(5,2) NOT NULL DEFAULT 0, -- % de chats respondidos
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS (leitura pública das estatísticas)
ALTER TABLE seller_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estatísticas do vendedor são públicas"
  ON seller_stats FOR SELECT
  USING (true);

CREATE POLICY "Sistema atualiza estatísticas"
  ON seller_stats FOR ALL
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 3. COLUNA is_featured em products (atalho de consulta)
-- =============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured, featured_until)
  WHERE is_featured = true;

-- =============================================
-- 4. FUNÇÃO: expirar destaques automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION expire_featured_products()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Marcar destaques expirados
  UPDATE featured_products
  SET status = 'expired'
  WHERE status = 'active'
    AND ends_at < now();

  -- Remover flag is_featured de produtos cujo destaque expirou
  UPDATE products p
  SET is_featured = false,
      featured_until = NULL
  WHERE p.is_featured = true
    AND (
      p.featured_until IS NULL
      OR p.featured_until < now()
    );
END;
$$;

-- =============================================
-- 5. TABELA: notification_templates (templates reutilizáveis)
-- =============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  icon        text,
  type        text NOT NULL DEFAULT 'system',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Templates padrão
INSERT INTO notification_templates (slug, title, body, type) VALUES
  ('new_order',         'Novo pedido recebido! 🎉',      'Você tem um novo pedido esperando sua confirmação.',         'new_order'),
  ('order_shipped',     'Pedido enviado 📦',              'Seu pedido foi marcado como enviado.',                      'new_order'),
  ('order_delivered',   'Entrega confirmada ✅',           'O comprador confirmou o recebimento do seu produto.',       'new_order'),
  ('payment_received',  'Pagamento recebido 💰',           'O pagamento foi liberado para sua carteira.',               'payment_received'),
  ('new_message',       'Nova mensagem 💬',               'Você recebeu uma nova mensagem.',                           'new_message'),
  ('review_received',   'Nova avaliação ⭐',              'Você recebeu uma avaliação de um comprador.',               'review_received'),
  ('product_sold',      'Produto vendido! 🏷️',           'Parabéns! Seu produto foi vendido.',                        'product_sold'),
  ('featured_expiring', 'Destaque expirando em breve ⏰', 'Seu anúncio em destaque expira em menos de 24 horas.',     'system')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 6. ÍNDICE de busca full-text em products (melhora performance da busca)
-- =============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_vector);
