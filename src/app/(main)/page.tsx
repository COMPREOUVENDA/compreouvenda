'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { CATEGORIES } from '@/lib/constants';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/types';

// Dynamic import for heavy ad carousel
const AdBannerCarousel = dynamic(() => import('@/components/ads/AdBannerCarousel'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-2xl mx-4" aria-hidden="true" />,
});

const AD_POSITIONS = { firstBreak: 3, interval: 5 }; // After 3 products, then every 5

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const { products, loading, fetchProducts, searchProducts } = useProducts();

  // Filter by category on client side (products already loaded)
  const filtered = useMemo(
    () => selectedCategory ? products.filter((p) => p.category_id === selectedCategory) : products,
    [products, selectedCategory]
  );

  // Build feed items with ads interspersed
  const feedItems = useMemo(() => {
    const items: { type: 'product' | 'ad'; data?: Product; variant?: 'full' | 'compact' | 'mini'; key: string }[] = [];
    let adCount = 0;

    filtered.forEach((product, i) => {
      items.push({ type: 'product', data: product, key: `p-${product.id}` });

      const position = i + 1;
      if (position === AD_POSITIONS.firstBreak) {
        items.push({ type: 'ad', variant: 'full', key: `ad-${adCount++}` });
      } else if (position > AD_POSITIONS.firstBreak && (position - AD_POSITIONS.firstBreak) % AD_POSITIONS.interval === 0) {
        const variant = adCount % 2 === 0 ? 'compact' : 'mini';
        items.push({ type: 'ad', variant, key: `ad-${adCount++}` });
      }
    });

    return items;
  }, [filtered]);

  const handleAdImpression = (adId: string) => {
    // TODO: Send to analytics/Supabase
    console.log('[Ad Impression]', adId);
  };

  const handleAdClick = (adId: string) => {
    // TODO: Send to analytics/Supabase + update budget
    console.log('[Ad Click]', adId);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="O que você procura?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11 pr-12"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-purple/10 rounded-xl hover:bg-brand-purple/20 transition-colors">
            <SlidersHorizontal className="w-4 h-4 text-brand-purple" />
          </button>
        </div>
      </div>

      {/* Hero Ad Carousel (Home top) */}
      <div className="py-2">
        <AdBannerCarousel
          variant="full"
          autoPlay
          autoPlayInterval={5000}
          onImpression={handleAdImpression}
          onAdClick={handleAdClick}
        />
      </div>

      {/* AI Banner */}
      <div className="px-4 py-2">
        <div className="bg-gradient-brand rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2.5">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-display font-bold text-sm">
              Venda com vídeo gerado por IA
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              Envie 8 fotos e transforme em vídeo automático
            </p>
          </div>
          <button className="bg-white text-brand-purple text-xs font-bold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors">
            Criar
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              !selectedCategory
                ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div className="px-4 flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg text-gray-900">
          {selectedCategory
            ? CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Produtos'
            : 'Perto de você'}
        </h2>
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'feed' ? 'bg-white shadow-sm text-brand-purple' : 'text-gray-500'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'grid' ? 'bg-white shadow-sm text-brand-purple' : 'text-gray-500'
            }`}
          >
            Grade
          </button>
        </div>
      </div>

      {/* Products with interleaved ads */}
      {loading ? (
        <div className="space-y-4 px-4 pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} style={viewMode === 'feed' ? 'feed' : 'card'} />
          ))}
        </div>
      ) : viewMode === 'feed' ? (
        <div className="space-y-4 pb-4">
          {feedItems.map((item, i) => (
            item.type === 'product' ? (
              <div
                key={item.key}
                className="px-4 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <ProductCard product={item.data!} style="feed" />
              </div>
            ) : (
              <div key={item.key} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
                <AdBannerCarousel
                  variant={item.variant}
                  autoPlay={item.variant === 'compact'}
                  autoPlayInterval={6000}
                  onImpression={handleAdImpression}
                  onAdClick={handleAdClick}
                />
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product, i) => (
              <div
                key={product.id}
                className="animate-scale-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
              >
                <ProductCard product={product} style="card" />
              </div>
            ))}
          </div>
          {/* Grid mode: single compact ad at bottom */}
          {filtered.length > 2 && (
            <div className="mt-4">
              <AdBannerCarousel
                variant="compact"
                autoPlay
                onImpression={handleAdImpression}
                onAdClick={handleAdClick}
              />
            </div>
          )}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 px-4">
          <p className="text-gray-400 text-lg font-display">Nenhum produto encontrado</p>
          <p className="text-gray-300 text-sm mt-1">Tente outra categoria ou busca</p>
        </div>
      )}
    </div>
  );
}
