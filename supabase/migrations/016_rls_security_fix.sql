-- Migration 016: Security fixes for RLS policies
-- Corrige policies muito permissivas em wallet, 2fa, withdrawals, chat attachments,
-- subscriptions/coupons e adiciona policies de admin corretas usando users.role.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. WALLET (seller_wallet, wallet_transactions, withdrawal_requests)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.seller_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas permissivas
DROP POLICY IF EXISTS wallet_all ON public.seller_wallet;
DROP POLICY IF EXISTS wallet_tx_all ON public.wallet_transactions;
DROP POLICY IF EXISTS withdrawals_all ON public.withdrawal_requests;

-- seller_wallet: usuário vê apenas sua carteira; admin vê tudo
CREATE POLICY "wallet_select_own"
  ON public.seller_wallet
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "wallet_update_own"
  ON public.seller_wallet
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- wallet_transactions: usuário vê apenas transações da sua carteira
CREATE POLICY "wallet_tx_select_own"
  ON public.wallet_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_wallet w
      WHERE w.id = wallet_transactions.wallet_id AND w.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "wallet_tx_insert_service"
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- withdrawal_requests: usuário vê apenas seus saques
CREATE POLICY "withdrawals_select_own"
  ON public.withdrawal_requests
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "withdrawals_insert_own"
  ON public.withdrawal_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 2FA (user_2fa)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS 2fa_all ON public.user_2fa;

CREATE POLICY "user_2fa_select_own"
  ON public.user_2fa
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "user_2fa_insert_own"
  ON public.user_2fa
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_2fa_update_own"
  ON public.user_2fa
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CHAT ATTACHMENTS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_attachments_select ON public.chat_attachments;
DROP POLICY IF EXISTS chat_attachments_insert ON public.chat_attachments;

CREATE POLICY "chat_attachments_select_participant"
  ON public.chat_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = chat_attachments.message_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "chat_attachments_insert_sender"
  ON public.chat_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = chat_attachments.message_id AND m.sender_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SUBSCRIPTIONS / COUPONS — corrige admin policy que usa users.type='admin'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_admin ON public.subscription_plans;
DROP POLICY IF EXISTS user_subscriptions_admin ON public.user_subscriptions;
DROP POLICY IF EXISTS coupons_admin ON public.coupons;
DROP POLICY IF EXISTS coupon_usage_admin ON public.coupon_usage;

-- subscription_plans: leitura pública para planos ativos; admin gerencia tudo
CREATE POLICY "subscription_plans_public_read"
  ON public.subscription_plans
  FOR SELECT
  USING (active = true);

CREATE POLICY "subscription_plans_admin_all"
  ON public.subscription_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- user_subscriptions: usuário vê a própria; admin vê tudo
CREATE POLICY "user_subscriptions_select_own"
  ON public.user_subscriptions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- coupons: leitura pública para cupons ativos; admin gerencia
CREATE POLICY "coupons_public_read"
  ON public.coupons
  FOR SELECT
  USING (active = true);

CREATE POLICY "coupons_admin_all"
  ON public.coupons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- coupon_usage: usuário vê próprio uso; admin vê tudo
CREATE POLICY "coupon_usage_select_own"
  ON public.coupon_usage
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. REVIEWS — garante policies seguras
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select ON public.reviews;
DROP POLICY IF EXISTS reviews_insert ON public.reviews;
DROP POLICY IF EXISTS reviews_update ON public.reviews;

CREATE POLICY "reviews_select_public"
  ON public.reviews
  FOR SELECT
  USING (true);

CREATE POLICY "reviews_insert_buyer"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "reviews_update_owner"
  ON public.reviews
  FOR UPDATE
  USING (
    reviewer_id = auth.uid()
    OR seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. NOTIFICATIONS — garante que usuário só vê as próprias notificações
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_update ON public.notifications;
DROP POLICY IF EXISTS notification_queue_select ON public.notification_queue;
DROP POLICY IF EXISTS notification_queue_insert ON public.notification_queue;

CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "notification_queue_select_own"
  ON public.notification_queue
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );
