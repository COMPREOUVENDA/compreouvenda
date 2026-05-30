-- Migration 010: P1 features - Wallet, Reviews, 2FA
-- Seller Wallet
CREATE TABLE IF NOT EXISTS public.seller_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  total_withdrawn DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.seller_wallet(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal', 'refund', 'fee')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pix_key TEXT NOT NULL,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  processed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  product_id UUID,
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  images JSONB,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2FA
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  backup_codes JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_user ON public.seller_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_2fa_user ON public.user_2fa(user_id);

-- RLS
ALTER TABLE public.seller_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "wallet_all" ON public.seller_wallet FOR ALL USING (true);
  CREATE POLICY "wallet_tx_all" ON public.wallet_transactions FOR ALL USING (true);
  CREATE POLICY "withdrawals_all" ON public.withdrawal_requests FOR ALL USING (true);
  CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
  CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (true);
  CREATE POLICY "reviews_update" ON public.reviews FOR UPDATE USING (true);
  CREATE POLICY "2fa_all" ON public.user_2fa FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
