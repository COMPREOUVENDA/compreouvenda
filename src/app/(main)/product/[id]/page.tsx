'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Share2, MapPin, MessageCircle, Eye, Star, Users, HandHeart, Play, ChevronLeft, ChevronRight, Gavel, Zap, Clock, ShieldCheck } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/constants';
import { formatPrice, formatDistance, conditionLabels } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import AdBannerCarousel from '@/components/ads/AdBannerCarousel';
import type { Product } from '@/types';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === params.id) || (MOCK_PRODUCTS[0] as Product);
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const images = product.images || [];
  const similarProducts = (MOCK_PRODUCTS as Product[]).filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Image Carousel */}
      <div className="relative aspect-[4/5] md:aspect-[16/10] bg-gray-900">
        {images.length > 0 && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{ backgroundImage: `url(${images[currentImage]?.url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <Link href="/" className="bg-black/30 backdrop-blur-sm rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="bg-black/30 backdrop-blur-sm rounded-full p-2"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-brand-pink text-brand-pink' : 'text-white'}`} />
            </button>
            <button className="bg-black/30 backdrop-blur-sm rounded-full p-2">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Video play */}
        {product.video_status === 'ready' && (
          <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md rounded-full p-5 hover:bg-white/30 transition-all">
            <Play className="w-8 h-8 text-white fill-white" />
          </button>
        )}

        {/* Image dots */}
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrentImage(Math.max(0, currentImage - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm rounded-full p-1.5">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setCurrentImage(Math.min(images.length - 1, currentImage + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm rounded-full p-1.5">
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? 'bg-white w-6' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-5 -mt-6 relative z-10">
        <div className="card-elevated p-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="badge-purple">{conditionLabels[product.condition]}</span>
            {product.flash_offer_enabled && product.flash_offer_status === 'active' && (
              <span className="badge bg-brand-pink/10 text-brand-pink flex items-center gap-1"><Zap className="w-3 h-3" /> Oferta Imperdível</span>
            )}
            {product.auction_enabled && product.auction_status === 'open' && (
              <span className="badge bg-brand-gold/10 text-brand-gold flex items-center gap-1"><Gavel className="w-3 h-3" /> Leilão Ativo</span>
            )}
            {product.donation_enabled && (
              <span className="badge bg-emerald-50 text-emerald-600 flex items-center gap-1"><HandHeart className="w-3 h-3" /> Doação</span>
            )}
            {product.allow_resale_by_others && (
              <span className="badge-blue flex items-center gap-1"><Users className="w-3 h-3" /> Comissão {product.reseller_commission_value}%</span>
            )}
          </div>

          {/* Title & Price */}
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900 leading-tight">{product.title}</h1>
            <div className="mt-2">
              {product.flash_offer_enabled && product.flash_offer_price ? (
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 line-through text-lg">{formatPrice(product.price)}</span>
                  <span className="font-display font-bold text-3xl text-brand-pink">{formatPrice(product.flash_offer_price)}</span>
                </div>
              ) : product.auction_enabled && product.auction_current_bid ? (
                <div>
                  <span className="text-xs text-gray-400">Lance atual</span>
                  <span className="font-display font-bold text-3xl text-brand-gold block">{formatPrice(product.auction_current_bid)}</span>
                </div>
              ) : (
                <span className="font-display font-bold text-3xl text-brand-purple">{formatPrice(product.price)}</span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {product.views_count} views</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {product.favorites_count} favoritos</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {product.usage_time || 'N/A'}</span>
          </div>
        </div>

        {/* Seller */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-lg">
              {product.user?.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-gray-900">{product.user?.name}</span>
                {product.user?.is_pro && <span className="bg-brand-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PRO</span>}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <MapPin className="w-3 h-3" />
                {product.distance_km !== undefined ? formatDistance(product.distance_km) : product.city}
                <span className="mx-1">·</span>
                <Star className="w-3 h-3 fill-brand-gold text-brand-gold" /> 4.8
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* Description */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-2">Descrição</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn-primary flex-1 flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" /> Falar com vendedor
          </button>
          {product.allow_resale_by_others && (
            <button className="btn-secondary flex items-center justify-center gap-2 px-4">
              <Users className="w-5 h-5" /> Vender
            </button>
          )}
        </div>

        {/* Auction section */}
        {product.auction_enabled && product.auction_status === 'open' && (
          <div className="card-elevated p-5 border-2 border-brand-gold/30">
            <h3 className="font-display font-semibold text-brand-gold flex items-center gap-2 mb-3">
              <Gavel className="w-5 h-5" /> Leilão Rápido
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="text-xs text-gray-400">Lance mínimo</span>
                <span className="block font-display font-bold text-gray-900">{formatPrice(product.auction_start_price || 0)}</span>
              </div>
              <div className="bg-brand-gold/10 rounded-xl p-3 text-center">
                <span className="text-xs text-brand-gold">Lance atual</span>
                <span className="block font-display font-bold text-brand-gold">{formatPrice(product.auction_current_bid || 0)}</span>
              </div>
            </div>
            <button className="btn-gradient w-full">Dar lance</button>
          </div>
        )}

        {/* Sponsored Ad */}
        <AdBannerCarousel variant="compact" autoPlay autoPlayInterval={6000} className="-mx-4" />

        {/* Similar */}
        <div>
          <h3 className="font-display font-semibold text-gray-900 mb-3">Produtos semelhantes</h3>
          <div className="grid grid-cols-2 gap-3">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} style="card" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
