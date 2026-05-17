-- COMPREOUVENDA.COM - Escrow System Migration
-- Migration: 003_escrow_system

-- ============================================
-- ESCROW TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment',
    'payment_held',
    'shipped',
    'delivered_pending_confirmation',
    'confirmed',
    'payment_released',
    'disputed',
    'cancelled'
  )),
  held_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ,
  reminder_48h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  qr_hash TEXT,
  qr_payload_encrypted TEXT,
  qr_expires_at TIMESTAMPTZ,
  qr_used BOOLEAN DEFAULT FALSE,
  qr_used_at TIMESTAMPTZ,
  released_by_admin BOOLEAN DEFAULT FALSE,
  released_by_actor UUID REFERENCES public.users(id),
  release_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_order ON public.escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_auto_release
  ON public.escrow_transactions(auto_release_at)
  WHERE status = 'delivered_pending_confirmation';

-- ============================================
-- ESCROW LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.escrow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id),
  actor_type TEXT CHECK (actor_type IN ('buyer', 'seller', 'admin', 'system')),
  old_status TEXT,
  new_status TEXT,
  details JSONB,
  ip_address TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_logs_transaction ON public.escrow_logs(transaction_id, created_at DESC);

-- ============================================
-- DISPUTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  escrow_transaction_id UUID NOT NULL REFERENCES public.escrow_transactions(id),
  opened_by UUID NOT NULL REFERENCES public.users(id),
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  resolution TEXT CHECK (resolution IN ('release_seller', 'refund_buyer', 'split')),
  split_seller_percent NUMERIC(5,2),
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON public.disputes(escrow_transaction_id);

-- ============================================
-- QR VALIDATION ATTEMPTS (anti-fraud)
-- ============================================
CREATE TABLE IF NOT EXISTS public.qr_validation_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.users(id),
  ip_address TEXT,
  device_fingerprint TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_attempts_order ON public.qr_validation_attempts(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_attempts_ip ON public.qr_validation_attempts(ip_address, created_at DESC);

-- ============================================
-- ALTER ORDERS TABLE
-- ============================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS dispute_id UUID;

-- ============================================
-- TRIGGER: update updated_at
-- ============================================
CREATE TRIGGER escrow_transactions_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_validation_attempts ENABLE ROW LEVEL SECURITY;

-- escrow_transactions: buyer e seller do pedido podem ver
CREATE POLICY "Partes do pedido veem escrow" ON public.escrow_transactions
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE
        buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
        seller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- escrow_logs: buyer e seller veem logs do seu pedido
CREATE POLICY "Partes veem logs escrow" ON public.escrow_logs
  FOR SELECT USING (
    transaction_id IN (
      SELECT et.id FROM public.escrow_transactions et
      JOIN public.orders o ON o.id = et.order_id
      WHERE
        o.buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
        o.seller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

-- disputes: partes do pedido podem ver e criar
CREATE POLICY "Partes veem disputas" ON public.disputes
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE
        buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
        seller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Compradores podem abrir disputas" ON public.disputes
  FOR INSERT WITH CHECK (
    opened_by IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- qr_validation_attempts: apenas o proprio comprador ve suas tentativas
CREATE POLICY "Comprador ve suas tentativas QR" ON public.qr_validation_attempts
  FOR SELECT USING (
    buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Count recent QR validation failures (rate limiting)
CREATE OR REPLACE FUNCTION count_qr_failures(
  p_order_id UUID,
  p_ip TEXT,
  p_window_minutes INT DEFAULT 60
) RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.qr_validation_attempts
  WHERE
    (order_id = p_order_id OR ip_address = p_ip)
    AND success = FALSE
    AND created_at >= NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get escrow dashboard metrics
CREATE OR REPLACE FUNCTION get_escrow_metrics() RETURNS JSONB AS $$
DECLARE
  v_total_held NUMERIC;
  v_count_held INT;
  v_count_disputes INT;
  v_avg_release_hours NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*)
  INTO v_total_held, v_count_held
  FROM public.escrow_transactions
  WHERE status IN ('payment_held', 'shipped', 'delivered_pending_confirmation');

  SELECT COUNT(*) INTO v_count_disputes
  FROM public.disputes WHERE status IN ('open', 'under_review');

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (released_at - held_at)) / 3600), 0)
  INTO v_avg_release_hours
  FROM public.escrow_transactions
  WHERE status = 'payment_released' AND released_at IS NOT NULL AND held_at IS NOT NULL;

  RETURN jsonb_build_object(
    'total_held', v_total_held,
    'count_held', v_count_held,
    'count_disputes', v_count_disputes,
    'avg_release_hours', ROUND(v_avg_release_hours::NUMERIC, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
