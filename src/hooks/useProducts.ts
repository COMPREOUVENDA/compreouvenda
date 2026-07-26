'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductImage } from '@/types';
import type { FeedFilters } from '@/components/feed/FilterDrawer';

const supabase = createClient();
const PAGE_SIZE = 20;

interface CreateProductData {
  title: string;
  description: string;
  category_id: string;
  price: number;
  condition: Product['condition'];
  city: string;
  state: string;
  location_lat?: number;
  location_lng?: number;
  negotiation_radius_km?: number;
  allow_resale_by_others?: boolean;
  reseller_commission_type?: 'percentage' | 'fixed';
  reseller_commission_value?: number;
  donation_enabled?: boolean;
  donation_type?: 'percentage' | 'fixed';
  donation_value?: number;
  charity_id?: string;
  auction_enabled?: boolean;
  auction_start_price?: number;
  auction_end_at?: string;
  flash_offer_enabled?: boolean;
  flash_offer_price?: number;
  flash_offer_end_at?: string;
}

// Seleção enxuta para o feed (thumbnail_url desnormalizado - migration 013)
const FEED_SELECT = `
  id, title, price, condition, city, state, views_count, favorites_count,
  is_featured, featured_until, thumbnail_url, category_id, user_id,
  flash_offer_enabled, flash_offer_price, flash_offer_status, flash_offer_end_at,
  auction_enabled, current_bid, bid_count, auction_end_at,
  is_donation, donation_percentage, created_at, updated_at,
  user:users!products_user_id_fkey(id, name, avatar_url, city, state),
  category:categories!products_category_id_fkey(id, name, icon, slug)
`;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(0);
  const filtersRef = useRef<{ categoryId?: string; search?: string; feedFilters?: FeedFilters }>({});

  const buildQuery = useCallback(async (categoryId?: string, search?: string, feedFilters?: FeedFilters, offset = 0) => {
    const params = new URLSearchParams();
    params.set('page', String(Math.floor(offset / PAGE_SIZE)));
    params.set('pageSize', String(PAGE_SIZE));
    if (categoryId) params.set('category_id', categoryId);
    if (search) params.set('search', search);

    const res = await fetch(`/api/products?${params.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Erro ao buscar produtos');
    return res.json() as Promise<{ products: Product[]; hasMore: boolean }>;
  }, []);

  const fetchProducts = useCallback(async (categoryId?: string, search?: string, feedFilters?: FeedFilters) => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    filtersRef.current = { categoryId, search, feedFilters };

    try {
      const { products: list, hasMore } = await buildQuery(categoryId, search, feedFilters, 0);
      setProducts(list || []);
      setHasMore(hasMore);
      pageRef.current = 1;
    } catch (e: any) {
      console.warn('Products fetch error:', e.message);
      setProducts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const { categoryId, search, feedFilters } = filtersRef.current;
    const offset = pageRef.current * PAGE_SIZE;

    try {
      const { products: newItems, hasMore: more } = await buildQuery(categoryId, search, feedFilters, offset);
      setProducts((prev) => [...prev, ...newItems]);
      setHasMore(more);
      pageRef.current += 1;
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, buildQuery]);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get single product (full data with images)
  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        images:product_images(id, url, position, label),
        user:users!products_user_id_fkey(id, name, avatar_url, city, state, phone),
        category:categories!products_category_id_fkey(id, name, icon, slug)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Product;
  }, []);

  // Create product
  const createProduct = useCallback(async (productData: CreateProductData, images: File[]): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { data: product, error: insertError } = await supabase
        .from('products')
        .insert({
          ...productData,
          user_id: profile.id,
          status: 'active',
          negotiation_radius_km: productData.negotiation_radius_km || 50,
          location_lat: productData.location_lat || -23.5505,
          location_lng: productData.location_lng || -46.6333,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (images.length > 0 && product) {
        await uploadProductImages(product.id, profile.id, images);
      }

      await fetchProducts();
      return product as Product;
    } catch (e: any) {
      setError(e.message || 'Erro ao criar produto');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  // Upload images
  const uploadProductImages = async (productId: string, userId: string, images: File[]) => {
    const LABELS = ['Frontal', 'Traseira', 'Lateral Esq.', 'Lateral Dir.', 'Detalhe 1', 'Detalhe 2', 'Detalhe 3', 'Detalhe 4'];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${productId}/${i + 1}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error(`Upload failed for image ${i + 1}:`, uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);

      await supabase.from('product_images').insert({
        product_id: productId,
        url: urlData.publicUrl,
        position: i + 1,
        label: LABELS[i] || `Foto ${i + 1}`,
      });
    }
  };

  // Update product
  const updateProduct = useCallback(async (id: string, updates: Partial<CreateProductData>): Promise<boolean> => {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setError(error.message);
      return false;
    }
    await fetchProducts();
    return true;
  }, [fetchProducts]);

  // Soft delete
  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'removed' })
      .eq('id', id);

    if (error) {
      setError(error.message);
      return false;
    }
    await fetchProducts();
    return true;
  }, [fetchProducts]);

  // Search (alias to fetchProducts with search)
  const searchProducts = useCallback((query: string, categoryId?: string) => {
    fetchProducts(categoryId || undefined, query || undefined);
  }, [fetchProducts]);

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchProducts,
    loadMore,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
  };
}
