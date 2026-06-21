-- Migration 013: Otimizações de performance baseadas no teste de carga
-- Problema identificado: Feed principal com avg 434ms e p95 1.56s em carga
-- Causa: LATERAL JOIN para buscar imagem principal gera N subqueries extras
-- Solução: coluna thumbnail_url desnormalizada diretamente em products

-- =============================================
-- 1. COLUNA thumbnail_url em products (elimina LATERAL JOIN no feed)
-- =============================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Popular com a primeira imagem existente de cada produto
UPDATE products p
SET thumbnail_url = (
  SELECT url
  FROM product_images pi
  WHERE pi.product_id = p.id
  ORDER BY pi.created_at ASC
  LIMIT 1
)
WHERE thumbnail_url IS NULL;

-- =============================================
-- 2. ÍNDICE COMPOSTO para o feed principal
-- (status + is_featured + created_at — exatamente a query ORDER BY do feed)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_feed
  ON products(status, is_featured DESC, created_at DESC)
  WHERE status = 'active';

-- =============================================
-- 3. ÍNDICE COMPOSTO para busca com categoria
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category_active
  ON products(category_id, status, created_at DESC)
  WHERE status = 'active';

-- =============================================
-- 4. ÍNDICE para busca de imagem principal (cobertura da LATERAL)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_product_images_primary
  ON product_images(product_id, created_at ASC)
  INCLUDE (url);

-- =============================================
-- 5. ÍNDICE para o histórico de chat (mais acessado após feed)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_messages_conv_date
  ON messages(conversation_id, created_at DESC);

-- =============================================
-- 6. ÍNDICE para listagem de pedidos (vendedor + comprador)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created
  ON orders(buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_created
  ON orders(seller_id, created_at DESC);

-- =============================================
-- 7. FUNÇÃO trigger: manter thumbnail_url sincronizado com product_images
-- =============================================
CREATE OR REPLACE FUNCTION sync_product_thumbnail()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET thumbnail_url = NEW.url
    WHERE id = NEW.product_id
      AND (thumbnail_url IS NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_thumbnail ON product_images;
CREATE TRIGGER trg_sync_thumbnail
  AFTER INSERT OR UPDATE ON product_images
  FOR EACH ROW EXECUTE FUNCTION sync_product_thumbnail();

-- =============================================
-- 8. VACUUM ANALYZE nas tabelas principais (atualiza estatísticas do planner)
-- =============================================
ANALYZE products;
ANALYZE product_images;
ANALYZE messages;
ANALYZE orders;
ANALYZE notification_queue;
