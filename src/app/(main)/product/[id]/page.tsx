'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Heart, Share2, MapPin, MessageCircle, Eye, Star, Users,
  HandHeart, Play, ChevronLeft, ChevronRight, Gavel, Zap, Clock,
  ShieldCheck, Loader2,
} from 'lucide-react';
import { formatPrice, formatDistance, conditionLabels, formatRelativeTime } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import { ProductJsonLd } from '@/components/seo/JsonLd';
import AuctionBid from '@/components/auction/AuctionBid';
import CountdownTimer from '@/components/ui/CountdownTimer';
import StarRating from '@/components/ui/StarRating';
import { useProducts } from '@/hooks/useProducts';
import { useFavorites } from '@/hooks/useFavorites';
import { useReviews } from '@/hooks/useReviews';
import { MOCK_PRODUCTS } from '@/lib/constants';
import type { Product } from '@/types';

const AdBannerCarousel = dynamic(() => import('@/components/ads/AdBannerCarousel'), {
  ssr: false,
  loading: () => <div className="h-28 bg-gray-100 animate-pulse rounded-2xl" aria-hidden="true" />,
});

interface ReviewModalProps {
  productId: string;
  sellerId: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

function ReviewModal({ productId, sellerId, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">Avaliar produto</h3>
        <div className="flex justify-center mb-4">
          <StarRating rating={rating} size="lg" interactive onChange={setRating} />
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte sua experiência..."
          className="input-field w-full h-24 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={() => { onSubmit(rating, comment); onClose(); }}
            className="btn-primary flex-1"
          >
            Enviar avaliação
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [flashExpired, setFlashExpired] = useState(false);
  const [auctionBid, setAuctionBid] = useState<number | null>(null);

  const { getProduct, products: allProducts } = useProducts();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { reviews, getProductReviews, createReview } = useReviews();
  const searchParams = useSearchParams();
  const refUserId = searchParams.get('ref');

  // Store ref in sessionStorage for commission tracking
  useEffect(() => {
    if (refUserId) {
      sessionStorage.setItem('ref_reseller_id', refUserId);
      sessionStorage.setItem('ref_product_id', params.id);
    }
  }, [refUserId, params.id]);

  useEffect(() => {
    const load = async () => {
      setLoadingProduct(true);
      const data = await getProduct(params.id);
      setProduct(data);
      setLoadingProduct(false);
    };
    load();
  }, [params.id, getProduct]);

  useEffect(() => {
    if (product) {
      getProductReviews(product.id);
      // Set flash expired based on end date
      if (product.flash_offer_end_at) {
        setFlashExpired(new Date(product.flash_offer_end_at) <= new Date());
      }
    }
  }, [product, getProductReviews]);

  const handleAuctionBid = useCallback((newBid: number) => {
    setAuctionBid(newBid);
    setProduct((prev) => prev ? { ...prev, auction_current_bid: newBid } : prev);
  }, []);

  const handleReview = useCallback(
    async (rating: number, comment: string) => {
      if (!product) return;
      await createReview({
        orderId: 'standalone',
        reviewedId: product.user_id,
        productId: product.id,
        rating,
        comment,
      });
    },
    [product, createReview]
  );

  const shareProduct = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }, [product]);

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-gray-400 font-display text-lg">Produto não encontrado</p>
        <Link href="/" className="btn-primary mt-4 inline-block">Voltar ao início</Link>
      </div>
    );
  }

  const images = product.images || [];
  const similarProducts = (MOCK_PRODUCTS as Product[])
    .filter((p) => p.category_id === product.category_id && p.id !== product.id)
    .slice(0, 4);

  const isFlashActive = product.flash_offer_enabled
    && product.flash_offer_status === 'active'
    && !flashExpired;

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const currentAuctionBid = auctionBid ?? product.auction_current_bid;

  return (
    <>
      <ProductJsonLd product={product} />
      {showReviewModal && (
        <ReviewModal
          productId={product.id}
          sellerId={product.user_id}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReview}
        />
      )}

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
                onClick={() => toggleFavorite(product.id)}
                className="bg-black/30 backdrop-blur-sm rounded-full p-2"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorite(product.id)
                      ? 'fill-brand-pink text-brand-pink'
                      : 'text-white'
                  }`}
                />
              </button>
              <button onClick={shareProduct} className="bg-black/30 backdrop-blur-sm rounded-full p-2">
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

          {/* Flash offer countdown badge on image */}
          {isFlashActive && product.flash_offer_end_at && (
            <div className="absolute bottom-16 left-4">
              <CountdownTimer endDate={product.flash_offer_end_at} compact onExpire={() => setFlashExpired(true)} />
            </div>
          )}

          {/* Image navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage(Math.max(0, currentImage - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm rounded-full p-1.5"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => setCurrentImage(Math.min(images.length - 1, currentImage + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm rounded-full p-1.5"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentImage ? 'bg-white w-6' : 'bg-white/50'
                    }`}
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
              {isFlashActive && (
                <span className="badge bg-brand-pink/10 text-brand-pink flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Oferta Imperdível
                </span>
              )}
              {flashExpired && product.flash_offer_enabled && (
                <span className="badge bg-gray-100 text-gray-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Oferta Expirada
                </span>
              )}
              {product.auction_enabled && product.auction_status === 'open' && (
                <span className="badge bg-brand-gold/10 text-brand-gold flex items-center gap-1">
                  <Gavel className="w-3 h-3" /> Leilão Ativo
                </span>
              )}
              {product.donation_enabled && (
                <span className="badge bg-emerald-50 text-emerald-600 flex items-center gap-1">
                  <HandHeart className="w-3 h-3" /> Doação
                </span>
              )}
              {product.allow_resale_by_others && (
                <span className="badge-blue flex items-center gap-1">
                  <Users className="w-3 h-3" /> Comissão {product.reseller_commission_value}%
                </span>
              )}
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="font-display font-bold text-2xl text-gray-900 leading-tight">
                {product.title}
              </h1>
              <div className="mt-2">
                {isFlashActive && product.flash_offer_price ? (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 line-through text-lg">
                      {formatPrice(product.price)}
                    </span>
                    <span className="font-display font-bold text-3xl text-brand-pink">
                      {formatPrice(product.flash_offer_price)}
                    </span>
                  </div>
                ) : product.auction_enabled && currentAuctionBid ? (
                  <div>
                    <span className="text-xs text-gray-400">Lance atual</span>
                    <span className="font-display font-bold text-3xl text-brand-gold block">
                      {formatPrice(currentAuctionBid)}
                    </span>
                  </div>
                ) : (
                  <span className="font-display font-bold text-3xl text-brand-purple">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" /> {product.views_count} views
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" /> {product.favorites_count} favoritos
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {product.usage_time || 'N/A'}
              </span>
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
                  <span className="font-display font-semibold text-gray-900">
                    {product.user?.name}
                  </span>
                  {(product.user as any)?.is_pro && (
                    <span className="bg-brand-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      PRO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <MapPin className="w-3 h-3" />
                  {product.distance_km !== undefined
                    ? formatDistance(product.distance_km)
                    : product.city}
                  <span className="mx-1">·</span>
                  {avgRating !== null ? (
                    <>
                      <Star className="w-3 h-3 fill-brand-gold text-brand-gold" />
                      {avgRating.toFixed(1)}
                    </>
                  ) : (
                    <>
                      <Star className="w-3 h-3 fill-brand-gold text-brand-gold" /> 4.8
                    </>
                  )}
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

          {/* Flash Offer countdown */}
          {isFlashActive && product.flash_offer_end_at && (
            <div className="card-elevated p-5 border-2 border-brand-pink/20 bg-brand-pink/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-pink" />
                  <span className="font-display font-semibold text-brand-pink">
                    Oferta termina em:
                  </span>
                </div>
                <CountdownTimer
                  endDate={product.flash_offer_end_at}
                  onExpire={() => setFlashExpired(true)}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              disabled={flashExpired && product.flash_offer_enabled && !product.auction_enabled}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageCircle className="w-5 h-5" /> Falar com vendedor
            </button>
            {product.allow_resale_by_others && (
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/product/${product.id}?ref=${sessionStorage.getItem('ref_reseller_id') || 'me'}`;
                  navigator.clipboard.writeText(shareUrl);
                }}
                className="btn-secondary flex items-center justify-center gap-2 px-4"
              >
                <Users className="w-5 h-5" /> Vender
              </button>
            )}
          </div>

          {/* Auction section */}
          {product.auction_enabled && product.auction_status === 'open' && (
            <div className="card-elevated p-5 border-2 border-brand-gold/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-brand-gold flex items-center gap-2">
                  <Gavel className="w-5 h-5" /> Leilão Rápido
                </h3>
                {product.auction_end_at && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Encerra em:</span>
                    <CountdownTimer endDate={product.auction_end_at} compact />
                  </div>
                )}
              </div>
              <AuctionBid product={{ ...product, auction_current_bid: currentAuctionBid ?? undefined }} onBidPlaced={handleAuctionBid} />
            </div>
          )}

          {/* Reviews */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-gray-900">
                Avaliações ({reviews.length})
              </h3>
              <button
                onClick={() => setShowReviewModal(true)}
                className="text-sm text-brand-purple font-semibold hover:underline"
              >
                + Avaliar
              </button>
            </div>

            {avgRating !== null && (
              <div className="flex items-center gap-3 mb-4">
                <span className="font-display font-bold text-4xl text-gray-900">
                  {avgRating.toFixed(1)}
                </span>
                <div>
                  <StarRating rating={avgRating} size="md" />
                  <span className="text-xs text-gray-400">{reviews.length} avaliações</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                        {review.reviewer?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {review.reviewer?.name || 'Usuário'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-[11px] text-gray-400">
                        {formatRelativeTime(review.created_at)}
                      </span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 ml-9">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

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
    </>
  );
}
