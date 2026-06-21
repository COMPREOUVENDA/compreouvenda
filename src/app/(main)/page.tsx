'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, SlidersHorizontal, Sparkles, Loader2 } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { CATEGORIES } from '@/lib/constants';
import { useProducts } from '@/hooks/useProducts';
import HeroCTA from '@/components/home/HeroCTA';
import FilterDrawer, { DEFAULT_FEED_FILTERS } from '@/components/feed/FilterDrawer';
import { track } from '@/lib/analytics';
import type { FeedFilters } from '@/components/feed/FilterDrawer';
import type { Product } from '@/types';

// Dynamic import para o carrossel pesado
const AdBannerCarousel = dynamic(() => import('@/components/ads/AdBannerCarousel'), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-2xl mx-4" aria-hidden="true" />,
});

const AD_POSITIONS = { firstBreak: 3, interval: 5 };

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS);
  const { products, loading, loadingMore, hasMore, fetchProducts, loadMore, searchProducts } = useProducts();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounced search com filtros
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts(selectedCategory || undefined, searchQuery || undefined, feedFilters);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, feedFilters]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const hasActiveFilters =
    feedFilters.priceMin ||
    feedFilters.priceMax ||
    feedFilters.conditions.length > 0 ||
    feedFilters.sort !== 'newest' ||
    feedFilters.onlyFeatured ||
    feedFilters.onlyWithVideo;

  // Monta feed intercalado com anúncios
  const feedItems = useMemo(() => {
    const items: { type: 'product' | 'ad'; data?: Product; variant?: 'full' | 'compact' | 'mini'; key: string }[] = [];
    let adCount = 0;

    products.forEach((product, i) => {
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
  }, [products]);

  const handleAdImpression = useCallback((adId: string) => {
    track('ad_impression', { ad_id: adId });
  }, []);

  const handleAdClick = useCallback((adId: string) => {
    track('ad_click', { ad_id: adId });
  }, []);

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
          <button
            onClick={() => setShowFilters(true)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors relative ${
              hasActiveFilters
                ? 'bg-brand-purple text-white'
                : 'bg-brand-purple/10 hover:bg-brand-purple/20'
            }`}
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal className={`w-4 h-4 ${hasActiveFilters ? 'text-white' : 'text-brand-purple'}`} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange rounded-full border-2 border-white" />
            )}
          </button>
        </div>
      </div>

      {/* Hero CTA */}
      <HeroCTA />

      {/* Hero Ad Carousel */}
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
          <Link href="/product/new" className="bg-white text-brand-purple text-xs font-bold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors">
            Criar
          </Link>
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

      {/* Section header */}
      <div className="px-4 flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display font-bold text-lg text-gray-900">
            {selectedCategory
              ? CATEGORIES.find((c) => c.id === selectedCategory)?.name || 'Produtos'
              : 'Perto de você'}
          </h2>
          {hasActiveFilters && (
            <p className="text-xs text-brand-purple font-medium mt-0.5">
              Filtros ativos
            </p>
          )}
        </div>
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

      {/* Products */}
      {loading ? (
        <div className="space-y-4 px-4 pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} style={viewMode === 'feed' ? 'feed' : 'card'} />
          ))}
        </div>
      ) : viewMode === 'feed' ? (
        <div className="space-y-4 pb-4">
          {feedItems.map((item, i) =>
            item.type === 'product' ? (
              <div
                key={item.key}
                className="px-4 animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'both' }}
              >
                <ProductCard product={item.data!} style="feed" />
              </div>
            ) : (
              <div key={item.key} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'both' }}>
                <AdBannerCarousel
                  variant={item.variant}
                  autoPlay={item.variant === 'compact'}
                  autoPlayInterval={6000}
                  onImpression={handleAdImpression}
                  onAdClick={handleAdClick}
                />
              </div>
            )
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="animate-scale-in"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'both' }}
              >
                <ProductCard product={product} style="card" />
              </div>
            ))}
          </div>
          {products.length > 2 && (
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

      {/* Empty state */}
      {!loading && products.length === 0 && (
        <div className="text-center py-20 px-4">
          <p className="text-gray-400 text-lg font-display">Nenhum produto encontrado</p>
          <p className="text-gray-300 text-sm mt-1">Tente outra categoria ou ajuste os filtros</p>
          {hasActiveFilters && (
            <button
              onClick={() => setFeedFilters(DEFAULT_FEED_FILTERS)}
              className="mt-4 text-brand-purple text-sm font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {/* Loading more */}
      {loadingMore && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
        </div>
      )}

      {/* End of feed */}
      {!loading && !hasMore && products.length > 0 && (
        <div className="text-center py-8 text-gray-300 text-sm">
          Você viu todos os produtos disponíveis
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={feedFilters}
        onChange={(f) => setFeedFilters(f)}
        resultCount={products.length}
      />
    </div>
  );
}
