-- Migration 009: Payments system
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  seller_amount DECIMAL(10,2) DEFAULT 0,
  method TEXT NOT NULL CHECK (method IN ('pix', 'credit_card', 'debit_card')),
  mp_payment_id TEXT,
  mp_status TEXT DEFAULT 'pending',
  mp_status_detail TEXT,
  pix_qr_code TEXT,
  pix_qr_base64 TEXT,
  pix_expiration TIMESTAMPTZ,
  card_last_four TEXT,
  card_brand TEXT,
  installments INT DEFAULT 1,
  refund_id TEXT,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_payment_id TEXT,
  event_type TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller ON public.payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_id ON public.payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(mp_status);
CREATE INDEX IF NOT EXISTS idx_webhooks_mp_id ON public.payment_webhooks(mp_payment_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (true);
  CREATE POLICY "payments_insert" ON public.payments FOR INSERT WITH CHECK (true);
  CREATE POLICY "payments_update" ON public.payments FOR UPDATE USING (true);
  CREATE POLICY "webhooks_all" ON public.payment_webhooks FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
