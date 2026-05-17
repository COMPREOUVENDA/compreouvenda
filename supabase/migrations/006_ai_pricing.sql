-- Migration: AI Pricing System
-- 006_ai_pricing.sql

-- ============================================================
-- TABLE: price_suggestions
-- ============================================================
CREATE TABLE IF NOT EXISTS price_suggestions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid,
  user_id             uuid NOT NULL,
  suggested_price     decimal(12,2) NOT NULL,
  min_price           decimal(12,2),
  max_price           decimal(12,2),
  quick_sale_price    decimal(12,2),
  max_profit_price    decimal(12,2),
  confidence_score    int CHECK (confidence_score BETWEEN 0 AND 100),
  market_position     text CHECK (market_position IN ('excellent','competitive','high','very_high')),
  estimated_days_to_sell int,
  demand_level        text CHECK (demand_level IN ('very_high','high','medium','low','very_low')),
  ai_model            text,
  analysis_data       jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: market_analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS market_analytics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category            text NOT NULL,
  avg_price           decimal(12,2),
  min_price           decimal(12,2),
  max_price           decimal(12,2),
  total_listings      int DEFAULT 0,
  sold_last_30_days   int DEFAULT 0,
  avg_days_to_sell    decimal(8,2),
  demand_score        int CHECK (demand_score BETWEEN 0 AND 100),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: ai_pricing_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_pricing_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  product_id      uuid,
  request_type    text,
  model_used      text,
  input_data      jsonb DEFAULT '{}',
  output_data     jsonb DEFAULT '{}',
  response_time_ms int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_price_suggestions_user_id ON price_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_price_suggestions_product_id ON price_suggestions(product_id);
CREATE INDEX IF NOT EXISTS idx_price_suggestions_created_at ON price_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_analytics_category ON market_analytics(category);
CREATE INDEX IF NOT EXISTS idx_market_analytics_updated_at ON market_analytics(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_pricing_logs_user_id ON ai_pricing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_logs_created_at ON ai_pricing_logs(created_at DESC);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE price_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pricing_logs ENABLE ROW LEVEL SECURITY;

-- price_suggestions: users see only their own
DROP POLICY IF EXISTS "price_suggestions_select_own" ON price_suggestions;
CREATE POLICY "price_suggestions_select_own"
  ON price_suggestions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "price_suggestions_insert_own" ON price_suggestions;
CREATE POLICY "price_suggestions_insert_own"
  ON price_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- market_analytics: public read
DROP POLICY IF EXISTS "market_analytics_select_all" ON market_analytics;
CREATE POLICY "market_analytics_select_all"
  ON market_analytics FOR SELECT
  USING (true);

-- ai_pricing_logs: users see only their own
DROP POLICY IF EXISTS "ai_pricing_logs_select_own" ON ai_pricing_logs;
CREATE POLICY "ai_pricing_logs_select_own"
  ON ai_pricing_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_pricing_logs_insert_own" ON ai_pricing_logs;
CREATE POLICY "ai_pricing_logs_insert_own"
  ON ai_pricing_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS for admin ops
-- (Supabase service_role key has full access by default)

-- ============================================================
-- SEED: market_analytics with initial data
-- ============================================================
INSERT INTO market_analytics (category, avg_price, min_price, max_price, total_listings, sold_last_30_days, avg_days_to_sell, demand_score)
VALUES
  ('1',  2500,   50,    15000, 320, 180, 8.5,  85),   -- Eletrônicos
  ('2',  800,    80,    8000,  150, 60,  14.2, 62),   -- Móveis
  ('3',  25000,  500,   150000,90,  30,  22.0, 55),   -- Veículos
  ('4',  120,    10,    1200,  280, 200, 5.1,  88),   -- Roupas
  ('5',  350,    20,    4000,  200, 120, 9.8,  72),   -- Esportes
  ('6',  250,    15,    3000,  180, 90,  11.5, 68),   -- Casa
  ('7',  80,     5,     800,   220, 160, 6.2,  78),   -- Brinquedos
  ('8',  40,     5,     500,   310, 240, 4.8,  82),   -- Livros
  ('9',  600,    30,    6000,  190, 130, 7.3,  80),   -- Games
  ('10', 90,     10,    900,   170, 140, 5.5,  83),   -- Beleza
  ('11', 200,    20,    2000,  130, 70,  13.0, 65),   -- Ferramentas
  ('12', 150,    5,     2000,  400, 250, 7.8,  75)    -- Outros
ON CONFLICT DO NOTHING;
