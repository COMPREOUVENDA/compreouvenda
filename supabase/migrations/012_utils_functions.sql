-- Migration 012: Funções utilitárias e correções de performance

-- =============================================
-- 1. FUNÇÃO: increment_views (atômico, sem race condition)
-- =============================================
CREATE OR REPLACE FUNCTION increment_views(product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = product_id;
$$;

-- =============================================
-- 2. FUNÇÃO: increment_favorites (chamada ao favoritar)
-- =============================================
CREATE OR REPLACE FUNCTION increment_favorites(product_id uuid, delta integer DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products
  SET favorites_count = GREATEST(0, COALESCE(favorites_count, 0) + delta)
  WHERE id = product_id;
$$;

-- =============================================
-- 3. FUNÇÃO: get_seller_stats (retorna estatísticas calculadas do vendedor)
-- =============================================
CREATE OR REPLACE FUNCTION get_seller_stats(seller_uuid uuid)
RETURNS TABLE (
  total_products  bigint,
  avg_rating      numeric,
  total_reviews   bigint,
  total_donated   numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM products WHERE user_id = seller_uuid AND status = 'active'),
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE seller_id = seller_uuid),
    (SELECT COUNT(*) FROM reviews WHERE seller_id = seller_uuid),
    (SELECT CAST(0 AS numeric));
$$;

-- =============================================
-- 4. ÍNDICE para consultas de histórico de notificações (melhora paginação)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_created
  ON notification_queue(user_id, created_at DESC);

-- =============================================
-- 5. ÍNDICE para consultas de pedidos por vendedor e comprador
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_seller_payment ON orders(seller_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_payment  ON orders(buyer_id, payment_status);

-- =============================================
-- 6. DEFAULT para views_count e favorites_count (evita NULLs)
-- =============================================
ALTER TABLE products
  ALTER COLUMN views_count     SET DEFAULT 0,
  ALTER COLUMN favorites_count SET DEFAULT 0;

UPDATE products
SET
  views_count     = COALESCE(views_count, 0),
  favorites_count = COALESCE(favorites_count, 0)
WHERE views_count IS NULL OR favorites_count IS NULL;
