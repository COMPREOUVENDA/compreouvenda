'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('categories')
      .select('id, name, slug, icon, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setCategories((data as Category[]) || []);
        }
        setLoading(false);
      });
  }, []);

  return { categories, loading, error };
}
