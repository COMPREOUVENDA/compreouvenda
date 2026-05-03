'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Product } from '@/types';
import { MOCK_PRODUCTS } from '@/lib/constants';

const supabase = createClient();

export function useFavorites() {
  const { user } = useAuthStore();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const getFavorites = useCallback(async () => {
    if (!user) {
      setFavorites((MOCK_PRODUCTS as Product[]).slice(0, 3));
      setFavoriteIds((MOCK_PRODUCTS as Product[]).slice(0, 3).map((p) => p.id));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          product_id,
          product:products(
            *,
            images:product_images(id, url, position, label),
            user:users!products_user_id_fkey(id, name, avatar_url, city, state),
            category:categories!products_category_id_fkey(id, name, icon, slug)
          )
        `)
        .eq('user_id', user.id);

      if (error || !data || data.length === 0) {
        setFavorites((MOCK_PRODUCTS as Product[]).slice(0, 3));
        setFavoriteIds((MOCK_PRODUCTS as Product[]).slice(0, 3).map((p) => p.id));
      } else {
        const products = data
          .map((f: any) => f.product)
          .filter(Boolean) as Product[];
        setFavorites(products);
        setFavoriteIds(data.map((f: any) => f.product_id));
      }
    } catch {
      setFavorites((MOCK_PRODUCTS as Product[]).slice(0, 3));
      setFavoriteIds((MOCK_PRODUCTS as Product[]).slice(0, 3).map((p) => p.id));
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
      if (!user) {
        setFavoriteIds((prev) => [...prev, productId]);
        return;
      }
      setFavoriteIds((prev) => [...prev, productId]);
      try {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, product_id: productId });
      } catch {
        // silently fail
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
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
      } catch {
        // silently fail
      }
    },
    [user]
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
