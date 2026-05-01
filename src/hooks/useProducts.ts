'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductImage } from '@/types';
import { MOCK_PRODUCTS } from '@/lib/constants';

const supabase = createClient();

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

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from Supabase, fallback to mock
  const fetchProducts = useCallback(async (categoryId?: string, search?: string) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, url, position, label),
          user:users!products_user_id_fkey(id, name, avatar_url, city, state),
          category:categories!products_category_id_fkey(id, name, icon, slug)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error: fetchError } = await query.limit(50);

      if (fetchError) {
        console.warn('Supabase fetch failed, using mock:', fetchError.message);
        setProducts(MOCK_PRODUCTS as Product[]);
      } else if (data && data.length > 0) {
        setProducts(data as Product[]);
      } else {
        // No products in DB yet, show mock for demo
        setProducts(MOCK_PRODUCTS as Product[]);
      }
    } catch (e: any) {
      console.warn('Products fetch error:', e.message);
      setProducts(MOCK_PRODUCTS as Product[]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get single product
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

    if (error || !data) {
      // Try mock
      const mock = (MOCK_PRODUCTS as Product[]).find(p => p.id === id);
      return mock || null;
    }
    return data as Product;
  }, []);

  // Create product
  const createProduct = useCallback(async (productData: CreateProductData, images: File[]): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Usuário não autenticado');

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      // Insert product
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

      // Upload images
      if (images.length > 0 && product) {
        await uploadProductImages(product.id, profile.id, images);
      }

      // Refresh list
      await fetchProducts();
      return product as Product;
    } catch (e: any) {
      setError(e.message || 'Erro ao criar produto');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  // Upload images for a product
  const uploadProductImages = async (productId: string, userId: string, images: File[]) => {
    const LABELS = ['Frontal', 'Traseira', 'Lateral Esq.', 'Lateral Dir.', 'Detalhe 1', 'Detalhe 2', 'Detalhe 3', 'Detalhe 4'];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/${productId}/${i + 1}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error(`Upload failed for image ${i + 1}:`, uploadError.message);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(path);

      // Insert image record
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

  // Delete (soft) product
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

  // Search
  const searchProducts = useCallback((query: string, categoryId?: string) => {
    fetchProducts(categoryId || undefined, query || undefined);
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
  };
}
