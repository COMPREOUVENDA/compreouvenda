-- COMPREOUVENDA.COM - Database Schema
-- Migration: Initial Setup

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- USERS
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('buyer', 'seller', 'charity')),
  phone TEXT,
  document TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(2,1) DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADMIN USERS (separate table for security)
-- ============================================
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin_operational', 'admin_financial', 'admin_support', 'admin_moderation', 'admin_content')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHARITIES
-- ============================================
CREATE TABLE public.charities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  document TEXT,
  email TEXT,
  phone TEXT,
  verified BOOLEAN DEFAULT FALSE,
  total_received NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  price NUMERIC(12,2) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'used')),
  usage_time TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  negotiation_radius_km INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'sold', 'removed')),
  -- Video
  video_url TEXT,
  video_thumbnail TEXT,
  video_status TEXT CHECK (video_status IN ('pending', 'validating', 'processing', 'composing', 'ready', 'failed')),
  video_type TEXT CHECK (video_type IN ('template', 'pika', 'runway')),
  video_provider TEXT,
  video_request_id TEXT,
  video_error_message TEXT,
  video_generated_at TIMESTAMPTZ,
  video_duration_seconds INT,
  regeneration_count INT DEFAULT 0,
  -- Commission
  allow_resale_by_others BOOLEAN DEFAULT FALSE,
  reseller_commission_type TEXT CHECK (reseller_commission_type IN ('percentage', 'fixed')),
  reseller_commission_value NUMERIC(10,2),
  -- Donation
  donation_enabled BOOLEAN DEFAULT FALSE,
  donation_type TEXT CHECK (donation_type IN ('percentage', 'fixed')),
  donation_value NUMERIC(10,2),
  charity_id UUID REFERENCES public.charities(id),
  -- Auction
  auction_enabled BOOLEAN DEFAULT FALSE,
  auction_start_price NUMERIC(12,2),
  auction_current_bid NUMERIC(12,2),
  auction_end_at TIMESTAMPTZ,
  auction_winner_id UUID REFERENCES public.users(id),
  auction_status TEXT CHECK (auction_status IN ('open', 'closed', 'cancelled')),
  -- Flash Offer
  flash_offer_enabled BOOLEAN DEFAULT FALSE,
  flash_offer_price NUMERIC(12,2),
  flash_offer_end_at TIMESTAMPTZ,
  flash_offer_status TEXT CHECK (flash_offer_status IN ('active', 'expired', 'cancelled')),
  -- Metrics
  views_count INT DEFAULT 0,
  favorites_count INT DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_user ON public.products(user_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_location ON public.products(location_lat, location_lng);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_created ON public.products(created_at DESC);

-- ============================================
-- PRODUCT IMAGES
-- ============================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  label TEXT,
  width INT,
  height INT,
  size_bytes INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- ============================================
-- PRODUCT VIDEOS (detailed tracking)
-- ============================================
CREATE TABLE public.product_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'processing', 'composing', 'ready', 'failed')),
  type TEXT NOT NULL CHECK (type IN ('template', 'pika', 'runway')),
  provider TEXT,
  request_id TEXT,
  error_message TEXT,
  duration_seconds INT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FAVORITES
-- ============================================
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================
-- SEARCH HISTORY
-- ============================================
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATIONS
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id),
  seller_id UUID NOT NULL REFERENCES public.users(id),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, buyer_id, seller_id)
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'proposal', 'image', 'system')),
  proposal_value NUMERIC(12,2),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  buyer_id UUID NOT NULL REFERENCES public.users(id),
  seller_id UUID NOT NULL REFERENCES public.users(id),
  reseller_id UUID REFERENCES public.users(id),
  reseller_link_id TEXT,
  gross_value NUMERIC(12,2) NOT NULL,
  platform_fee NUMERIC(12,2) DEFAULT 0,
  gateway_fee NUMERIC(12,2) DEFAULT 0,
  reseller_commission_value NUMERIC(12,2) DEFAULT 0,
  donation_value NUMERIC(12,2) DEFAULT 0,
  seller_net_value NUMERIC(12,2) DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'held', 'released', 'refunded', 'disputed', 'failed')),
  payment_provider TEXT,
  transaction_id TEXT,
  split_status TEXT DEFAULT 'pending' CHECK (split_status IN ('pending', 'processing', 'completed', 'failed')),
  delivery_type TEXT CHECK (delivery_type IN ('local_pickup', 'partner_delivery')),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'in_transit', 'delivered', 'confirmed')),
  buyer_confirmed BOOLEAN DEFAULT FALSE,
  seller_confirmed BOOLEAN DEFAULT FALSE,
  delivery_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS (detailed payment records)
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'held', 'released', 'refunded', 'disputed', 'failed')),
  provider TEXT,
  provider_transaction_id TEXT,
  method TEXT,
  installments INT DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENT SPLITS
-- ============================================
CREATE TABLE public.payment_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('seller', 'reseller', 'charity', 'platform')),
  recipient_id UUID,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider_split_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMMISSIONS
-- ============================================
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  reseller_id UUID NOT NULL REFERENCES public.users(id),
  owner_id UUID NOT NULL REFERENCES public.users(id),
  order_id UUID REFERENCES public.orders(id),
  shareable_link TEXT UNIQUE,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value NUMERIC(10,2) NOT NULL,
  calculated_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DONATIONS
-- ============================================
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  charity_id UUID NOT NULL REFERENCES public.charities(id),
  donor_id UUID NOT NULL REFERENCES public.users(id),
  donation_type TEXT NOT NULL CHECK (donation_type IN ('percentage', 'fixed')),
  donation_value NUMERIC(10,2) NOT NULL,
  calculated_amount NUMERIC(12,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'transferred', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUCTIONS (bid history)
-- ============================================
CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.users(id),
  amount NUMERIC(12,2) NOT NULL,
  is_winning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auction_bids_product ON public.auction_bids(product_id, amount DESC);

-- ============================================
-- FLASH OFFERS (detailed tracking)
-- ============================================
CREATE TABLE public.flash_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  original_price NUMERIC(12,2) NOT NULL,
  offer_price NUMERIC(12,2) NOT NULL,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'sold')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id),
  reported_type TEXT NOT NULL CHECK (reported_type IN ('product', 'user', 'message')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUPPORT TICKETS
-- ============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  assigned_to UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- ============================================
-- ADMIN AUDIT LOGS
-- ============================================
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON public.admin_audit_logs(admin_id, created_at DESC);

-- ============================================
-- SYSTEM SETTINGS
-- ============================================
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('platform_fee_percent', '10', 'Taxa da plataforma (%)'),
  ('max_photos_per_product', '8', 'Máximo de fotos por produto'),
  ('max_video_duration_seconds', '20', 'Duração máxima do vídeo (segundos)'),
  ('max_negotiation_radius_km', '100', 'Raio máximo de negociação (km)'),
  ('video_generation_daily_limit', '5', 'Limite diário de geração de vídeo'),
  ('commission_min_percent', '1', 'Comissão mínima (%)'),
  ('commission_max_percent', '30', 'Comissão máxima (%)');

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Products policies
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'active' OR user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can insert own products" ON public.products FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Product images policies
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Product owners can manage images" ON public.product_images FOR ALL USING (product_id IN (SELECT id FROM public.products WHERE user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())));

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (
  buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
  seller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
);

-- Messages policies
CREATE POLICY "Users can view conversation messages" ON public.messages FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE
    buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
    seller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (
  buyer_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
  seller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
  reseller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Commissions policies
CREATE POLICY "Users can view own commissions" ON public.commissions FOR SELECT USING (
  reseller_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) OR
  owner_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
);

-- Auction bids policies
CREATE POLICY "Anyone can view bids" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "Users can place bids" ON public.auction_bids FOR INSERT WITH CHECK (bidder_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Admin policies (admin_users can access everything via service role)
CREATE POLICY "Only admins can view admin users" ON public.admin_users FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "Only admins can view audit logs" ON public.admin_audit_logs FOR SELECT USING (admin_id IN (SELECT id FROM public.admin_users WHERE auth_id = auth.uid()));

-- Categories (public read)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

-- Charities (public read)
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view charities" ON public.charities FOR SELECT USING (verified = true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate split values
CREATE OR REPLACE FUNCTION calculate_payment_split(
  p_gross_value NUMERIC,
  p_platform_fee_percent NUMERIC DEFAULT 10,
  p_commission_type TEXT DEFAULT NULL,
  p_commission_value NUMERIC DEFAULT 0,
  p_donation_type TEXT DEFAULT NULL,
  p_donation_value NUMERIC DEFAULT 0,
  p_gateway_fee_percent NUMERIC DEFAULT 2.5
) RETURNS JSONB AS $$
DECLARE
  v_gateway_fee NUMERIC;
  v_platform_fee NUMERIC;
  v_commission NUMERIC;
  v_donation NUMERIC;
  v_seller_net NUMERIC;
BEGIN
  v_gateway_fee := ROUND(p_gross_value * p_gateway_fee_percent / 100, 2);
  v_platform_fee := ROUND(p_gross_value * p_platform_fee_percent / 100, 2);

  IF p_commission_type = 'percentage' THEN
    v_commission := ROUND(p_gross_value * p_commission_value / 100, 2);
  ELSIF p_commission_type = 'fixed' THEN
    v_commission := p_commission_value;
  ELSE
    v_commission := 0;
  END IF;

  v_seller_net := p_gross_value - v_gateway_fee - v_platform_fee - v_commission;

  IF p_donation_type = 'percentage' THEN
    v_donation := ROUND(v_seller_net * p_donation_value / 100, 2);
  ELSIF p_donation_type = 'fixed' THEN
    v_donation := LEAST(p_donation_value, v_seller_net);
  ELSE
    v_donation := 0;
  END IF;

  v_seller_net := v_seller_net - v_donation;

  RETURN jsonb_build_object(
    'gross_value', p_gross_value,
    'gateway_fee', v_gateway_fee,
    'platform_fee', v_platform_fee,
    'commission', v_commission,
    'donation', v_donation,
    'seller_net', v_seller_net
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update product updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default categories
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Eletrônicos', 'eletronicos', '📱', 1),
  ('Móveis', 'moveis', '🛋️', 2),
  ('Veículos', 'veiculos', '🚗', 3),
  ('Roupas', 'roupas', '👕', 4),
  ('Esportes', 'esportes', '⚽', 5),
  ('Casa', 'casa', '🏠', 6),
  ('Brinquedos', 'brinquedos', '🧸', 7),
  ('Livros', 'livros', '📚', 8),
  ('Games', 'games', '🎮', 9),
  ('Beleza', 'beleza', '💄', 10),
  ('Ferramentas', 'ferramentas', '🔧', 11),
  ('Outros', 'outros', '📦', 12);
