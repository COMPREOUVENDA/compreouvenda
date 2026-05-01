'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink, Store, Package, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

export interface AdBanner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  cta: string;
  link: string;
  linkType: 'product' | 'store' | 'external';
  seller: string;
  badge?: string;
  gradient: string;
  accentColor: string;
  priority: number;        // bid-based priority (higher = more visible)
  relevanceScore: number;  // 0-100 user relevance
  categoryId?: string;
  locationKm?: number;
  impressions: number;
  clicks: number;
  budget: number;
  spent: number;
  campaignId: string;
  segmentation?: {
    categories?: string[];
    maxDistanceKm?: number;
    userTypes?: ('buyer' | 'seller' | 'charity')[];
  };
}

interface AdBannerCarouselProps {
  ads?: AdBanner[];
  autoPlay?: boolean;
  autoPlayInterval?: number;  // ms
  variant?: 'full' | 'compact' | 'mini';
  className?: string;
  maxFrequency?: number; // max times same ad shows per session
  onImpression?: (adId: string) => void;
  onAdClick?: (adId: string) => void;
}

// ==================== MOCK ADS DATA ====================

const MOCK_ADS: AdBanner[] = [
  {
    id: 'ad-1',
    title: 'iPhone 15 Pro Max',
    subtitle: 'A partir de 12x de R$ 499',
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=400&fit=crop',
    cta: 'Ver Oferta',
    link: '/product/1',
    linkType: 'product',
    seller: 'TechStore Oficial',
    badge: '🔥 Mais Vendido',
    gradient: 'from-purple-900 via-purple-800 to-indigo-900',
    accentColor: 'bg-brand-purple',
    priority: 95,
    relevanceScore: 88,
    categoryId: 'electronics',
    impressions: 12400,
    clicks: 598,
    budget: 500,
    spent: 320,
    campaignId: 'camp-1',
  },
  {
    id: 'ad-2',
    title: 'Mega Saldão de Móveis',
    subtitle: 'Até 60% OFF em sofás e estantes',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=400&fit=crop',
    cta: 'Explorar Loja',
    link: '/product/2',
    linkType: 'store',
    seller: 'Casa & Conforto',
    badge: '⚡ Oferta Flash',
    gradient: 'from-orange-900 via-orange-800 to-amber-900',
    accentColor: 'bg-brand-orange',
    priority: 82,
    relevanceScore: 75,
    categoryId: 'furniture',
    impressions: 8900,
    clicks: 445,
    budget: 300,
    spent: 210,
    campaignId: 'camp-2',
  },
  {
    id: 'ad-3',
    title: 'Bicicletas Speed & Mountain',
    subtitle: 'Frete grátis para SP e RJ',
    image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&h=400&fit=crop',
    cta: 'Conferir',
    link: '/product/3',
    linkType: 'product',
    seller: 'Pedal Livre Sports',
    badge: '🚚 Frete Grátis',
    gradient: 'from-emerald-900 via-teal-800 to-cyan-900',
    accentColor: 'bg-emerald-500',
    priority: 70,
    relevanceScore: 65,
    categoryId: 'sports',
    impressions: 5200,
    clicks: 260,
    budget: 200,
    spent: 87,
    campaignId: 'camp-3',
  },
  {
    id: 'ad-4',
    title: 'Moda Feminina Premium',
    subtitle: 'Coleção Outono/Inverno 2026',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop',
    cta: 'Ver Coleção',
    link: '/product/4',
    linkType: 'store',
    seller: 'Elegância Store',
    badge: '✨ Novidade',
    gradient: 'from-pink-900 via-rose-800 to-fuchsia-900',
    accentColor: 'bg-brand-pink',
    priority: 60,
    relevanceScore: 72,
    categoryId: 'fashion',
    impressions: 7100,
    clicks: 355,
    budget: 250,
    spent: 150,
    campaignId: 'camp-4',
  },
  {
    id: 'ad-5',
    title: 'PlayStation 5 + 3 Jogos',
    subtitle: 'Bundle exclusivo por R$ 3.299',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=400&fit=crop',
    cta: 'Comprar Agora',
    link: '/product/5',
    linkType: 'product',
    seller: 'GameZone BR',
    badge: '🎮 Exclusivo',
    gradient: 'from-blue-900 via-blue-800 to-indigo-900',
    accentColor: 'bg-brand-blue',
    priority: 88,
    relevanceScore: 90,
    categoryId: 'electronics',
    impressions: 15600,
    clicks: 780,
    budget: 400,
    spent: 280,
    campaignId: 'camp-5',
  },
];

// Sort by priority + relevance weighted score
function rankAds(ads: AdBanner[]): AdBanner[] {
  return [...ads].sort((a, b) => {
    const scoreA = a.priority * 0.6 + a.relevanceScore * 0.4;
    const scoreB = b.priority * 0.6 + b.relevanceScore * 0.4;
    return scoreB - scoreA;
  });
}

// ==================== COMPONENT ====================

export default function AdBannerCarousel({
  ads = MOCK_ADS,
  autoPlay = true,
  autoPlayInterval = 4500,
  variant = 'full',
  className,
  onImpression,
  onAdClick,
}: AdBannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>();
  const impressionTracker = useRef<Set<string>>(new Set());

  const rankedAds = rankAds(ads);
  const total = rankedAds.length;

  // Track impressions
  useEffect(() => {
    const ad = rankedAds[currentIndex];
    if (ad && !impressionTracker.current.has(ad.id)) {
      impressionTracker.current.add(ad.id);
      onImpression?.(ad.id);
    }
  }, [currentIndex, rankedAds, onImpression]);

  // Auto-play
  useEffect(() => {
    if (!isAutoPlaying || total <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, autoPlayInterval);
    return () => clearInterval(autoPlayRef.current);
  }, [isAutoPlaying, total, autoPlayInterval]);

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    clearInterval(autoPlayRef.current);
  }, []);

  const resumeAutoPlay = useCallback(() => {
    if (autoPlay) {
      setTimeout(() => setIsAutoPlaying(true), 3000);
    }
  }, [autoPlay]);

  const goTo = (index: number) => {
    setCurrentIndex(((index % total) + total) % total);
  };

  const handleClick = (ad: AdBanner) => {
    onAdClick?.(ad.id);
  };

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    pauseAutoPlay();
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDelta) > 50) {
      if (touchDelta > 0) goTo(currentIndex - 1);
      else goTo(currentIndex + 1);
    }
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
    resumeAutoPlay();
  };

  const linkTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package className="w-3 h-3" />;
      case 'store': return <Store className="w-3 h-3" />;
      case 'external': return <ExternalLink className="w-3 h-3" />;
      default: return null;
    }
  };

  if (total === 0) return null;

  // ==================== MINI VARIANT ====================
  if (variant === 'mini') {
    const ad = rankedAds[currentIndex];
    return (
      <div className={cn('px-4', className)}>
        <Link
          href={ad.link}
          onClick={() => handleClick(ad)}
          className="flex items-center gap-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-3 border border-gray-200/50 hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${ad.image})` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Patrocinado</span>
              {ad.badge && <span className="text-[9px]">{ad.badge}</span>}
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{ad.title}</p>
            <p className="text-[10px] text-gray-400">{ad.seller}</p>
          </div>
          <span className={cn('text-[10px] font-bold text-white px-2.5 py-1 rounded-full', ad.accentColor)}>
            {ad.cta}
          </span>
        </Link>
      </div>
    );
  }

  // ==================== COMPACT VARIANT ====================
  if (variant === 'compact') {
    return (
      <div className={cn('px-4', className)}>
        <div className="relative overflow-hidden rounded-2xl" ref={containerRef}>
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? touchDelta : 0}px))`,
              transition: isDragging ? 'none' : undefined,
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseEnter={pauseAutoPlay}
            onMouseLeave={resumeAutoPlay}
          >
            {rankedAds.map((ad) => (
              <Link
                key={ad.id}
                href={ad.link}
                onClick={() => handleClick(ad)}
                className="flex-shrink-0 w-full"
              >
                <div className={cn('relative h-28 rounded-2xl overflow-hidden bg-gradient-to-r', ad.gradient)}>
                  <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${ad.image})` }} />
                  <div className="relative h-full flex items-center px-5 gap-4">
                    <div className="flex-1">
                      <span className="text-[9px] text-white/50 font-semibold uppercase tracking-widest">Patrocinado</span>
                      <h3 className="text-white font-display font-bold text-base mt-0.5">{ad.title}</h3>
                      {ad.subtitle && <p className="text-white/60 text-xs mt-0.5">{ad.subtitle}</p>}
                    </div>
                    <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-xl border border-white/10">
                      {ad.cta}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {/* Dots */}
          {total > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {rankedAds.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { goTo(i); pauseAutoPlay(); resumeAutoPlay(); }}
                  className={cn('rounded-full transition-all duration-300', i === currentIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== FULL VARIANT (default) ====================
  return (
    <div className={cn('px-4', className)}>
      <div
        className="relative overflow-hidden rounded-3xl shadow-lg"
        ref={containerRef}
        onMouseEnter={pauseAutoPlay}
        onMouseLeave={resumeAutoPlay}
      >
        {/* Slides */}
        <div
          className="flex transition-transform duration-600 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? touchDelta : 0}px))`,
            transition: isDragging ? 'none' : 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {rankedAds.map((ad) => (
            <div key={ad.id} className="flex-shrink-0 w-full">
              <Link href={ad.link} onClick={() => handleClick(ad)} className="block">
                <div className={cn('relative h-44 sm:h-52 overflow-hidden bg-gradient-to-br', ad.gradient)}>
                  {/* Background image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 scale-110"
                    style={{ backgroundImage: `url(${ad.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

                  {/* Content */}
                  <div className="relative h-full flex items-center px-6 py-5">
                    <div className="flex-1 max-w-[65%]">
                      {/* Sponsored badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-[0.2em] flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> Patrocinado
                        </span>
                        {ad.badge && (
                          <span className="text-[10px] bg-white/15 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                            {ad.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="text-white font-display font-bold text-xl sm:text-2xl leading-tight">
                        {ad.title}
                      </h3>
                      {ad.subtitle && (
                        <p className="text-white/60 text-sm mt-1">{ad.subtitle}</p>
                      )}

                      <div className="flex items-center gap-3 mt-3">
                        <span className={cn('text-sm font-bold text-white px-5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg', ad.accentColor)}>
                          {linkTypeIcon(ad.linkType)}
                          {ad.cta}
                        </span>
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                          {linkTypeIcon(ad.linkType)}
                          {ad.seller}
                        </span>
                      </div>
                    </div>

                    {/* Product image preview */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 rotate-3 hover:rotate-0 transition-transform duration-300">
                      <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${ad.image})` }} />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Navigation Arrows (desktop) */}
        {total > 1 && (
          <>
            <button
              onClick={() => { goTo(currentIndex - 1); pauseAutoPlay(); resumeAutoPlay(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full hidden sm:flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { goTo(currentIndex + 1); pauseAutoPlay(); resumeAutoPlay(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/30 backdrop-blur-sm text-white rounded-full hidden sm:flex items-center justify-center hover:bg-black/50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots + Progress bar */}
        {total > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1.5">
            {/* Auto-play progress */}
            {isAutoPlaying && (
              <div className="w-16 h-0.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/80 rounded-full"
                  style={{
                  animation: `adprogress ${autoPlayInterval}ms linear infinite`,
                  }}
                />
              </div>
            )}
            <div className="flex gap-1.5">
              {rankedAds.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { goTo(i); pauseAutoPlay(); resumeAutoPlay(); }}
                  className={cn(
                    'rounded-full transition-all duration-400',
                    i === currentIndex ? 'w-6 h-2 bg-white shadow-lg' : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar animation via inline style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes adprogress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}} />
    </div>
  );
}
