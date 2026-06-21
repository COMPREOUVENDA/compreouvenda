'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Star, Package, ShoppingBag, MapPin, Calendar,
  MessageCircle, Shield, Award, Heart, TrendingUp, Loader2,
  CheckCircle, BadgeCheck, HandHeart, Users, Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime, formatPrice } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import StarRating from '@/components/ui/StarRating';
import StartChatButton from '@/components/chat/StartChatButton';
import type { Product, User } from '@/types';

const supabase = createClient();

interface SellerStats {
  totalProducts: number;
  totalSold: number;
  avgRating: number;
  totalReviews: number;
  totalDonated: number;
  memberSince: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { name: string; avatar_url?: string };
}

export default function SellerProfilePage({ params }: { params: { id: string } }) {
  const [seller, setSeller] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'produtos' | 'avaliacoes'>('produtos');
  const [notFound, setNotFound] = useState(false);

  const loadSeller = useCallback(async () => {
    setLoading(true);

    // Buscar perfil do vendedor
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (userError || !userData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setSeller(userData as User);

    // Buscar produtos ativos do vendedor
    const { data: productsData } = await supabase
      .from('products')
      .select('*, images:product_images(*), category:categories(*)')
      .eq('user_id', params.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12);

    setProducts((productsData as Product[]) || []);

    // Buscar avaliações recebidas
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, reviewer:reviewer_id(name, avatar_url)')
      .eq('seller_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setReviews((reviewsData as Review[]) || []);

    // Calcular estatísticas
    const { count: soldCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', params.id)
      .eq('status', 'completed');

    const { data: donationsData } = await supabase
      .from('donations')
      .select('amount')
      .eq('seller_id', params.id);

    const totalDonated = (donationsData || []).reduce((sum, d) => sum + (d.amount || 0), 0);

    const avgRating = reviewsData && reviewsData.length > 0
      ? reviewsData.reduce((sum, r: Review) => sum + r.rating, 0) / reviewsData.length
      : 0;

    setStats({
      totalProducts: (productsData || []).length,
      totalSold: soldCount || 0,
      avgRating,
      totalReviews: reviewsData?.length || 0,
      totalDonated,
      memberSince: userData.created_at,
    });

    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadSeller();
  }, [loadSeller]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (notFound || !seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">Vendedor não encontrado</h2>
        <p className="text-gray-500 text-center">Este perfil não existe ou foi removido.</p>
        <Link href="/" className="btn-primary">Voltar ao início</Link>
      </div>
    );
  }

  const trustLevel = (stats?.avgRating || 0) >= 4.5 ? 'top' : (stats?.avgRating || 0) >= 3.5 ? 'bom' : 'novo';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header de navegação */}
      <div className="sticky top-0 z-30 glass border-b border-gray-200/50 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-semibold text-gray-800 truncate">Perfil do Vendedor</span>
      </div>

      {/* Banner do perfil */}
      <div className="relative h-32 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      {/* Card principal do vendedor */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-sm -mt-8 p-6 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {seller.avatar_url ? (
                <Image
                  src={seller.avatar_url}
                  alt={seller.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-4 ring-white shadow-md">
                  <span className="text-white font-bold text-2xl">
                    {seller.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              {trustLevel === 'top' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow">
                  <Award className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Informações */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl text-gray-900 truncate">{seller.name}</h1>
                {seller.type === 'seller' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    <BadgeCheck className="w-3 h-3" />
                    Vendedor
                  </span>
                )}
              </div>

              {/* Localização */}
              {(seller.city || seller.state) && (
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{[seller.city, seller.state].filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* Avaliação */}
              {stats && stats.totalReviews > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={stats.avgRating} size="sm" />
                  <span className="text-sm font-medium text-gray-700">
                    {stats.avgRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({stats.totalReviews} avaliações)
                  </span>
                </div>
              )}

              {/* Bio */}
              {seller.bio && (
                <p className="text-gray-600 text-sm mt-2 line-clamp-2">{seller.bio}</p>
              )}
            </div>
          </div>

          {/* Botão de chat */}
          <div className="mt-4">
            <StartChatButton productId={`profile-${seller.id}`} sellerId={seller.id} sellerName={seller.name} />
          </div>

          {/* Membro desde */}
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Membro desde {formatRelativeTime(seller.created_at)}</span>
          </div>
        </div>

        {/* Cards de estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
              <div className="text-xs text-gray-500 mt-0.5">Anúncios ativos</div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <ShoppingBag className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSold}</div>
              <div className="text-xs text-gray-500 mt-0.5">Vendas concluídas</div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalReviews > 0 ? stats.avgRating.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Nota média</div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <HandHeart className="w-5 h-5 text-pink-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalDonated > 0 ? formatPrice(stats.totalDonated) : 'R$ 0'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Doado às causas</div>
            </div>
          </div>
        )}

        {/* Selos de confiança */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Selos de confiança</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
              <CheckCircle className="w-3.5 h-3.5" />
              Cadastro verificado
            </span>
            {(stats?.totalSold || 0) >= 10 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                <TrendingUp className="w-3.5 h-3.5" />
                10+ vendas
              </span>
            )}
            {(stats?.avgRating || 0) >= 4.5 && (stats?.totalReviews || 0) >= 5 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full border border-yellow-200">
                <Award className="w-3.5 h-3.5" />
                Vendedor Top
              </span>
            )}
            {(stats?.totalDonated || 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 text-xs font-medium rounded-full border border-pink-200">
                <Heart className="w-3.5 h-3.5" />
                Solidário
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
              <Shield className="w-3.5 h-3.5" />
              Escrow ativo
            </span>
          </div>
        </div>

        {/* Tabs: Produtos / Avaliações */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('produtos')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'produtos'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Package className="w-4 h-4" />
                Produtos ({products.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('avaliacoes')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'avaliacoes'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Star className="w-4 h-4" />
                Avaliações ({reviews.length})
              </span>
            </button>
          </div>

          <div className="p-4">
            {/* Tab Produtos */}
            {activeTab === 'produtos' && (
              <>
                {products.length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhum produto ativo no momento</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} viewMode="grid" />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tab Avaliações */}
            {activeTab === 'avaliacoes' && (
              <>
                {reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhuma avaliação ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Resumo de avaliações */}
                    {stats && stats.totalReviews > 0 && (
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl mb-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</div>
                          <StarRating rating={stats.avgRating} size="sm" />
                          <div className="text-xs text-gray-500 mt-1">{stats.totalReviews} avaliações</div>
                        </div>
                        <div className="flex-1">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = reviews.filter((r) => r.rating === star).length;
                            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                            return (
                              <div key={star} className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500 w-3">{star}</span>
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 w-4">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Lista de avaliações */}
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            {review.reviewer?.avatar_url ? (
                              <Image
                                src={review.reviewer.avatar_url}
                                alt={review.reviewer.name || ''}
                                width={36}
                                height={36}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-sm font-bold">
                                {review.reviewer?.name?.charAt(0) || 'A'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-800">
                                {review.reviewer?.name || 'Comprador anônimo'}
                              </span>
                              <span className="text-xs text-gray-400">{formatRelativeTime(review.created_at)}</span>
                            </div>
                            <StarRating rating={review.rating} size="sm" />
                            {review.comment && (
                              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Aviso de segurança */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 mb-6">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Compre com segurança</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Todas as transações são protegidas pelo sistema de escrow da COMPREOUVENDA. Seu dinheiro só é liberado após confirmar o recebimento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
