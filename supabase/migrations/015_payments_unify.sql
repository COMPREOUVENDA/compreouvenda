-- Migration 015: Unify and secure payments schema
-- Resolve conflito entre migrations 001 e 009, adiciona campos do PagBank,
-- cria tabela de webhooks e corrige RLS permissivas.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Normaliza a tabela public.payments (criada na migration 001) adicionando
--    colunas que a migration 009 tentou criar, sem conflitos.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pix_qr_base64 TEXT,
  ADD COLUMN IF NOT EXISTS pix_expiration TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS card_last_four TEXT,
  ADD COLUMN IF NOT EXISTS card_brand TEXT,
  ADD COLUMN IF NOT EXISTS refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Garante FK em order_id (pode já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_order_id_fkey'
      AND table_schema = 'public' AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id);
  END IF;
END $$;

-- Ajusta CHECK de status para incluir valores usados pelo PagBank/escrow
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN (
    'pending', 'paid', 'held', 'released', 'refunded', 'disputed', 'failed',
    'authorized', 'cancelled', 'charged_back'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Cria tabela de webhooks de pagamento (PagBank / outros gateways)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  provider TEXT,
  provider_payment_id TEXT,
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Índices de performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller ON public.payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_tx
  ON public.payments(provider, provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON public.payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider_payment
  ON public.payment_webhooks(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed
  ON public.payment_webhooks(processed, created_at)
  WHERE processed = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Corrige RLS da tabela payments
--    Remove policies abertas e cria policies restritas.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas permissivas
DROP POLICY IF EXISTS payments_select_own ON public.payments;
DROP POLICY IF EXISTS payments_insert ON public.payments;
DROP POLICY IF EXISTS payments_update ON public.payments;
DROP POLICY IF EXISTS webhooks_all ON public.payment_webhooks;

-- Comprador/seller só vê seus próprios pagamentos
CREATE POLICY "payments_select_own"
  ON public.payments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.uid() = seller_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- Apenas service role / trigger pode inserir pagamentos
CREATE POLICY "payments_insert_service"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- Apenas service role / trigger pode atualizar pagamentos
CREATE POLICY "payments_update_service"
  ON public.payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- Webhooks: leitura/escrita apenas por service role (admin)
CREATE POLICY "webhooks_admin_only"
  ON public.payment_webhooks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Trigger de updated_at (garante independentemente de migration anterior)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
