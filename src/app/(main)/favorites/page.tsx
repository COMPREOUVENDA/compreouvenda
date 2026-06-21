'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Heart, Loader2, SlidersHorizontal, X, Search, Trash2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import ProductCard from '@/components/product/ProductCard';
import { CATEGORIES } from '@/lib/constants';

type SortOption = 'newest' | 'price_asc' | 'price_desc';

export default function FavoritesPage() {
  const { favorites, loading, removeFavorite } = useFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(id);
    await removeFavorite(id);
    setRemoving(null);
  };

  // Categorias que aparecem nos favoritos
  const activeCategoryIds = useMemo(
    () => Array.from(new Set(favorites.map((p) => p.category_id).filter(Boolean))) as string[],
    [favorites]
  );

  const filtered = useMemo(() => {
    let list = [...favorites];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title?.toLowerCase().includes(q));
    }

    if (selectedCategory) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }

    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        list.sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
    }

    return list;
  }, [favorites, search, selectedCategory, sort]);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-pink/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-brand-pink" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-gray-900">Meus Favoritos</h1>
            <p className="text-xs text-gray-400">{favorites.length} produto{favorites.length !== 1 ? 's' : ''} salvos</p>
          </div>
          {favorites.length > 0 && (
            <span className="ml-auto badge-pink text-sm font-bold">{favorites.length}</span>
          )}
        </div>

        {/* Search */}
        {favorites.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nos favoritos..."
              className="input-field pl-10 pr-4"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      ) : favorites.length === 0 ? (
        /* Empty state */
        <div className="text-center px-4 py-20">
          <div className="w-20 h-20 rounded-3xl bg-brand-pink/10 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-brand-pink/40" />
          </div>
          <h2 className="font-display font-bold text-lg text-gray-800 mb-1">Nenhum favorito ainda</h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
            Toque no coração em qualquer produto para salvar e acessar depois
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Explorar produtos
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="px-4 mb-3">
            {/* Category chips */}
            {activeCategoryIds.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    !selectedCategory
                      ? 'bg-brand-purple text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                {activeCategoryIds.map((catId) => {
                  const cat = CATEGORIES.find((c) => c.id === catId);
                  if (!cat) return null;
                  return (
                    <button
                      key={catId}
                      onClick={() => setSelectedCategory(catId === selectedCategory ? null : catId)}
                      className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedCategory === catId
                          ? 'bg-brand-purple text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sort */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {filtered.length} de {favorites.length} produto{favorites.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="text-xs font-medium text-gray-600 bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="newest">Mais recente</option>
                  <option value="price_asc">Menor preço</option>
                  <option value="price_desc">Maior preço</option>
                </select>
              </div>
            </div>
          </div>

          {/* No results after filter */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum produto encontrado</p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory(null); }}
                className="mt-3 text-brand-purple text-sm font-semibold hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4">
              {filtered.map((product, i) => (
                <div
                  key={product.id}
                  className="relative animate-scale-in"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms`, animationFillMode: 'both' }}
                >
                  <ProductCard product={product} style="card" />
                  {/* Remove button overlay */}
                  <button
                    onClick={(e) => handleRemove(product.id, e)}
                    disabled={removing === product.id}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                    aria-label="Remover dos favoritos"
                  >
                    {removing === product.id ? (
                      <Loader2 className="w-3.5 h-3.5 text-brand-pink animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-brand-pink" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
