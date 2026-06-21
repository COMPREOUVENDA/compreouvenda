'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Product } from '@/types';

const supabase = createClient();

export function useFavorites() {
  const { user } = useAuthStore();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const getFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          product_id,
          product:products(
            id, title, price, condition, city, state, views_count, favorites_count,
            is_featured, featured_until, thumbnail_url, category_id, user_id,
            flash_offer_enabled, flash_offer_price, flash_offer_status, flash_offer_end_at,
            auction_enabled, current_bid, bid_count, auction_end_at,
            is_donation, donation_percentage, created_at, updated_at,
            user:users!products_user_id_fkey(id, name, avatar_url, city, state),
            category:categories!products_category_id_fkey(id, name, icon, slug)
          )
        `)
        .eq('user_id', user.id);

      if (error || !data) {
        setFavorites([]);
        setFavoriteIds([]);
      } else {
        const products = data
          .map((f: any) => f.product)
          .filter(Boolean) as unknown as Product[];
        setFavorites(products);
        setFavoriteIds(data.map((f: any) => f.product_id));
      }
    } catch {
      setFavorites([]);
      setFavoriteIds([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds]
  );

  const addFavorite = useCallback(
    async (productId: string) => {
      if (!user) return;
      setFavoriteIds((prev) => [...prev, productId]);
      try {
        await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
      } catch {
        setFavoriteIds((prev) => prev.filter((id) => id !== productId));
      }
    },
    [user]
  );

  const removeFavorite = useCallback(
    async (productId: string) => {
      setFavoriteIds((prev) => prev.filter((id) => id !== productId));
      setFavorites((prev) => prev.filter((p) => p.id !== productId));
      if (!user) return;
      try {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
      } catch {
        await getFavorites();
      }
    },
    [user, getFavorites]
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (isFavorite(productId)) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  useEffect(() => {
    getFavorites();
  }, [getFavorites]);

  return {
    favorites,
    favoriteIds,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getFavorites,
  };
}
