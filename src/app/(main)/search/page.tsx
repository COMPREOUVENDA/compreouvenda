'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/constants';
import { formatPrice, conditionLabels } from '@/lib/utils';
import { track } from '@/lib/analytics';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';

const supabase = createClient();

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Mais recente' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'views_desc', label: 'Mais vistos' },
];

const CONDITIONS = [
  { value: 'new', label: 'Novo' },
  { value: 'like_new', label: 'Seminovo' },
  { value: 'good', label: 'Bom estado' },
  { value: 'fair', label: 'Razoável' },
  { value: 'used', label: 'Usado' },
] as const;

type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'used';

interface Filters {
  category: string;
  priceMin: string;
  priceMax: string;
  conditions: Condition[];
  sort: string;
}

const defaultFilters: Filters = {
  category: '',
  priceMin: '',
  priceMax: '',
  conditions: [],
  sort: 'created_at_desc',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applySearch = useCallback(async (q: string, f: Filters) => {
    setLoading(true);
    try {
      let dbQuery = supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, url, position, label),
          user:users!products_user_id_fkey(id, name, avatar_url, city, state),
          category:categories!products_category_id_fkey(id, name, icon, slug)
        `)
        .eq('status', 'active');

      if (q) {
        dbQuery = dbQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }
      if (f.category) {
        dbQuery = dbQuery.eq('category_id', f.category);
      }
      if (f.priceMin) {
        dbQuery = dbQuery.gte('price', parseFloat(f.priceMin));
      }
      if (f.priceMax) {
        dbQuery = dbQuery.lte('price', parseFloat(f.priceMax));
      }
      if (f.conditions.length > 0) {
        dbQuery = dbQuery.in('condition', f.conditions);
      }

      // Sorting
      const [sortField, sortDir] = f.sort.split('_');
      const ascending = sortDir === 'asc';
      if (sortField === 'created') {
        dbQuery = dbQuery.order('created_at', { ascending: false });
      } else if (sortField === 'price') {
        dbQuery = dbQuery.order('price', { ascending });
      } else if (sortField === 'views') {
        dbQuery = dbQuery.order('views_count', { ascending: false });
      } else {
        dbQuery = dbQuery.order('created_at', { ascending: false });
      }

      const { data, error } = await dbQuery.limit(60);

      if (error || !data) {
        setProducts([]);
      } else {
        setProducts(data as Product[]);
        if (q) track('search', { query: q, value: data.length });
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      applySearch(query, filters);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filters, applySearch]);

  const toggleCondition = (c: Condition) => {
    setFilters((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(c)
        ? prev.conditions.filter((x) => x !== c)
        : [...prev.conditions, c],
    }));
  };

  const clearFilters = () => setFilters(defaultFilters);
  const hasActiveFilters =
    filters.category ||
    filters.priceMin ||
    filters.priceMax ||
    filters.conditions.length > 0 ||
    filters.sort !== 'created_at_desc';

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos..."
            className="input-field pl-10 w-full"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
            hasActiveFilters
              ? 'border-brand-purple bg-brand-purple text-white'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-white rounded-full" />
          )}
        </button>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'feed' : 'grid')}
          className="p-2.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-gray-300"
        >
          {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card-elevated p-5 mb-4 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-gray-900">Filtros</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-brand-purple font-semibold hover:underline">
                Limpar tudo
              </button>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Categoria</label>
            <div className="relative">
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
                className="input-field appearance-none w-full pr-8"
              >
                <option value="">Todas as categorias</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Faixa de preço</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                <input
                  type="number"
                  value={filters.priceMin}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceMin: e.target.value }))}
                  placeholder="Mín"
                  className="input-field pl-9 w-full"
                  min={0}
                />
              </div>
              <span className="text-gray-400">—</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                <input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceMax: e.target.value }))}
                  placeholder="Máx"
                  className="input-field pl-9 w-full"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Condição</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => toggleCondition(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                    filters.conditions.includes(c.value)
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Ordenar por</label>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilters((prev) => ({ ...prev, sort: opt.value }))}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                    filters.sort === opt.value
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowFilters(false)}
            className="btn-primary w-full"
          >
            Ver {products.length} resultado{products.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {loading ? 'Buscando...' : `${products.length} resultado${products.length !== 1 ? 's' : ''}`}
          {query && <span className="font-semibold text-gray-900"> para &ldquo;{query}&rdquo;</span>}
        </p>
      </div>

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-2xl" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-display">Nenhum produto encontrado</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-brand-purple font-semibold mt-2 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} style="card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} style="feed" />
          ))}
        </div>
      )}
    </div>
  );
}
