'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, User } from '@/types';

const supabase = createClient();

export interface SellerStats {
  totalProducts: number;
  totalSold: number;
  totalRevenue: number;
  totalDonated: number;
  avgRating: number;
  totalReviews: number;
  memberSince: string;
}

export interface SellerReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { name: string; avatar_url?: string };
}

export interface SellerProfile {
  user: User;
  products: Product[];
  reviews: SellerReview[];
  stats: SellerStats;
}

export function useSellerProfile() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (sellerId: string): Promise<SellerProfile | null> => {
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar dados do usuário
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', sellerId)
        .single();

      if (userError || !userData) {
        setError('Vendedor não encontrado');
        return null;
      }

      // 2. Buscar produtos ativos em paralelo com avaliações
      const [productsResult, reviewsResult] = await Promise.all([
        supabase
          .from('products')
          .select('*, images:product_images(*), category:categories(*)')
          .eq('user_id', sellerId)
          .eq('status', 'active')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(12),

        supabase
          .from('reviews')
          .select('*, reviewer:reviewer_id(name, avatar_url)')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const products = (productsResult.data as Product[]) || [];
      const reviews = (reviewsResult.data as SellerReview[]) || [];

      // 3. Buscar estatísticas do cache (seller_stats) ou calcular
      const { data: statsCache } = await supabase
        .from('seller_stats')
        .select('*')
        .eq('user_id', sellerId)
        .single();

      let stats: SellerStats;

      if (statsCache) {
        stats = {
          totalProducts: statsCache.total_products,
          totalSold: statsCache.total_sold,
          totalRevenue: statsCache.total_revenue,
          totalDonated: statsCache.total_donated,
          avgRating: statsCache.avg_rating,
          totalReviews: statsCache.total_reviews,
          memberSince: userData.created_at,
        };
      } else {
        // Calcular na hora se não houver cache
        const { count: soldCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', sellerId)
          .eq('status', 'completed');

        const { data: donationsData } = await supabase
          .from('donations')
          .select('amount')
          .eq('seller_id', sellerId);

        const totalDonated = (donationsData || []).reduce((sum, d) => sum + (d.amount || 0), 0);
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        stats = {
          totalProducts: products.length,
          totalSold: soldCount || 0,
          totalRevenue: 0,
          totalDonated,
          avgRating,
          totalReviews: reviews.length,
          memberSince: userData.created_at,
        };
      }

      const result: SellerProfile = {
        user: userData as User,
        products,
        reviews,
        stats,
      };

      setProfile(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar perfil';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { profile, loading, error, loadProfile };
}
