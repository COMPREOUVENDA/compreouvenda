export interface User {
  id: string;
  auth_id?: string;
  email: string;
  name: string;
  avatar_url?: string;
  type: 'buyer' | 'seller' | 'charity';
  role?: 'user' | 'admin' | 'super_admin';
  phone?: string;
  location_lat?: number;
  location_lng?: number;
  city?: string;
  state?: string;
  seller_type?: 'individual' | 'company';
  donation_percent?: number;
  rating?: number;
  rating_count?: number;
  bio?: string;
  created_at: string;
  is_pro: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin_operational' | 'admin_financial' | 'admin_support' | 'admin_moderation' | 'admin_content';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export interface Product {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category_id: string;
  price: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'used';
  usage_time?: string;
  location_lat: number;
  location_lng: number;
  city: string;
  state: string;
  negotiation_radius_km: number;
  status: 'active' | 'paused' | 'sold' | 'removed';
  // Video
  video_url?: string;
  video_thumbnail?: string;
  video_status?: 'pending' | 'validating' | 'processing' | 'composing' | 'ready' | 'failed';
  video_type?: 'template' | 'pika' | 'runway';
  video_provider?: string;
  video_request_id?: string;
  video_error_message?: string;
  video_generated_at?: string;
  video_duration_seconds?: number;
  regeneration_count: number;
  // Commission
  allow_resale_by_others: boolean;
  reseller_commission_type?: 'percentage' | 'fixed';
  reseller_commission_value?: number;
  // Donation
  donation_enabled: boolean;
  donation_type?: 'percentage' | 'fixed';
  donation_value?: number;
  charity_id?: string;
  // Auction
  auction_enabled: boolean;
  auction_start_price?: number;
  auction_current_bid?: number;
  auction_end_at?: string;
  auction_winner_id?: string;
  auction_status?: 'open' | 'closed' | 'cancelled';
  // Flash offer
  flash_offer_enabled: boolean;
  flash_offer_price?: number;
  flash_offer_end_at?: string;
  flash_offer_status?: 'active' | 'expired' | 'cancelled';
  // Featured / Patrocinado
  is_featured?: boolean;
  featured_until?: string;
  // Meta
  views_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  images?: ProductImage[];
  category?: Category;
  distance_km?: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
  label: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  product?: Product;
  buyer?: User;
  seller?: User;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'proposal' | 'image';
  proposal_value?: number;
  read?: boolean;
  created_at: string;
  sender?: User;
}

export interface Order {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  reseller_id?: string;
  gross_value: number;
  platform_fee: number;
  gateway_fee: number;
  reseller_commission_value: number;
  donation_value: number;
  seller_net_value: number;
  net_value?: number;
  payment_status: 'pending' | 'paid' | 'held' | 'released' | 'refunded' | 'disputed' | 'failed';
  payment_provider?: string;
  transaction_id?: string;
  split_status?: 'pending' | 'processing' | 'completed' | 'failed';
  delivery_type: 'local_pickup' | 'partner_delivery';
  delivery_status: 'pending' | 'in_transit' | 'delivered' | 'confirmed';
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  delivery_confirmed_at?: string;
  created_at: string;
  updated_at?: string;
  product?: Product;
  buyer?: User;
  seller?: User;
}

export interface Charity {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  verified: boolean;
  total_received: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'new_order' | 'new_message' | 'price_alert' | 'product_sold' | 'review_received' | 'payment_received' | 'promotion' | 'system' | string;
  read: boolean;
  url?: string;
  image?: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface LGPDConsents {
  terms_accepted: boolean;
  privacy_accepted: boolean;
  geolocation_accepted: boolean;
  marketing_accepted: boolean;
  version: string;
  timestamp: string;
}
