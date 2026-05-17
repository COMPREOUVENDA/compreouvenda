'use client';

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, MapPin, Play, Zap, Users, HandHeart, Gavel, Package } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice, formatDistance, formatRelativeTime, conditionLabels } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  style?: 'card' | 'feed';
}

const PLACEHOLDER_GRADIENTS = [
  'from-purple-400 to-indigo-600',
  'from-pink-400 to-rose-600',
  'from-amber-400 to-orange-600',
  'from-teal-400 to-cyan-600',
  'from-green-400 to-emerald-600',
  'from-blue-400 to-sky-600',
];

function getPlaceholderGradient(id: string): string {
  const idx = id.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length;
  return PLACEHOLDER_GRADIENTS[idx];
}

function ProductCard({ product, style = 'card' }: ProductCardProps) {
  const mainImage = product.images?.[0]?.url || product.video_thumbnail || '';
  const hasImage = Boolean(mainImage);

  if (style === 'feed') {
    return (
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden group">
          {/* Image or placeholder */}
          {hasImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${mainImage})` }}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${getPlaceholderGradient(product.id)} flex items-center justify-center transition-transform duration-700 group-hover:scale-105`}
            >
              <Package className="w-16 h-16 text-white/30" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Video indicator */}
          {product.video_status === 'ready' && (
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-full p-2">
              <Play className="w-4 h-4 text-white fill-white" aria-hidden="true" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {product.flash_offer_enabled && product.flash_offer_status === 'active' && (
              <div className="bg-brand-pink text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" aria-hidden="true" /> OFERTA
              </div>
            )}
            {product.allow_resale_by_others && (
              <div className="bg-brand-blue/90 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" aria-hidden="true" /> COMISSÃO
              </div>
            )}
            {product.donation_enabled && (
              <div className="bg-emerald-500/90 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <HandHeart className="w-3 h-3" aria-hidden="true" /> DOAÇÃO
              </div>
            )}
            {product.auction_enabled && product.auction_status === 'open' && (
              <div className="bg-brand-gold/90 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Gavel className="w-3 h-3" aria-hidden="true" /> LEILÃO
              </div>
            )}
          </div>

          {/* Favorite */}
          <button
            aria-label="Adicionar aos favoritos"
            className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-sm rounded-full p-2 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={(e) => { e.preventDefault(); }}
          >
            <Heart className="w-5 h-5 text-white" aria-hidden="true" />
          </button>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold" aria-hidden="true">
                {product.user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-white/80 text-sm font-medium">
                {product.user?.name}
              </span>
              {product.user?.is_pro && (
                <span className="bg-brand-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PRO</span>
              )}
            </div>

            <h3 className="text-white font-display font-bold text-lg leading-tight mb-1">
              {product.title}
            </h3>

            <div className="flex items-end justify-between">
              <div>
                {product.flash_offer_enabled && product.flash_offer_price ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-sm line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-brand-gold font-display font-bold text-xl">
                      {formatPrice(product.flash_offer_price)}
                    </span>
                  </div>
                ) : product.auction_enabled && product.auction_current_bid ? (
                  <div>
                    <span className="text-white/60 text-xs">Lance atual</span>
                    <span className="text-brand-gold font-display font-bold text-xl block">
                      {formatPrice(product.auction_current_bid)}
                    </span>
                  </div>
                ) : (
                  <span className="text-white font-display font-bold text-xl">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-white/60 text-xs">
                <MapPin className="w-3 h-3" aria-hidden="true" />
                {product.distance_km !== undefined
                  ? formatDistance(product.distance_km)
                  : `${product.city}`}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Card style
  return (
    <Link href={`/product/${product.id}`} className="block">
      <div className="card group">
        <div className="relative aspect-square overflow-hidden">
          {hasImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${mainImage})` }}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${getPlaceholderGradient(product.id)} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}
            >
              <Package className="w-10 h-10 text-white/30" aria-hidden="true" />
            </div>
          )}
          {product.video_status === 'ready' && (
            <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm rounded-full p-1.5">
              <Play className="w-3 h-3 text-white fill-white" aria-hidden="true" />
            </div>
          )}
          <button
            aria-label="Adicionar aos favoritos"
            className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-purple"
            onClick={(e) => { e.preventDefault(); }}
          >
            <Heart className="w-4 h-4 text-gray-600" aria-hidden="true" />
          </button>

          {/* Badges */}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {product.flash_offer_enabled && product.flash_offer_status === 'active' && (
              <span className="bg-brand-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⚡ OFERTA</span>
            )}
            {product.donation_enabled && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">💚 DOAÇÃO</span>
            )}
          </div>
        </div>

        <div className="p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <span className="badge-purple text-[10px] py-0.5 px-2">
              {conditionLabels[product.condition] || product.condition}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeTime(product.created_at)}</span>
          </div>

          <h3 className="font-display font-semibold text-sm leading-tight mb-1.5 line-clamp-2">
            {product.title}
          </h3>

          <div className="flex items-end justify-between">
            <span className="font-display font-bold text-brand-purple text-lg">
              {formatPrice(product.price)}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {product.distance_km !== undefined
                ? formatDistance(product.distance_km)
                : product.city}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default memo(ProductCard);
