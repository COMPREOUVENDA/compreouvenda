'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Settings, Star, Package, ShoppingBag, Heart, MapPin,
  CheckCircle, Share2, Edit3, Loader2, TrendingUp,
  MessageCircle, UserCheck, Shield,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import StarRating from '@/components/ui/StarRating';
import type { Product } from '@/types';

const supabase = createClient();

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  type: string;
  created_at: string;
  is_verified?: boolean;
  avg_rating?: number;
  total_reviews?: number;
  total_sales?: number;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'sold' | 'reviews'>('listings');
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      // Carregar perfil
      const { data: profileData } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, bio, city, state, type, created_at')
        .eq('auth_id', user.id)
        .single();

      if (!profileData) {
        router.replace('/settings');
        return;
      }

      // Carregar stats em paralelo
      const [listingsRes, soldRes, reviewsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, title, price, condition, city, state, views_count, favorites_count, thumbnail_url, category_id, user_id, is_featured, flash_offer_enabled, flash_offer_price, flash_offer_status, flash_offer_end_at, auction_enabled, current_bid, bid_count, auction_end_at, is_donation, donation_percentage, created_at, updated_at, user:users!products_user_id_fkey(id, name, avatar_url, city, state), category:categories!products_category_id_fkey(id, name, icon, slug)')
          .eq('user_id', profileData.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', profileData.id)
          .eq('payment_status', 'paid'),
        supabase
          .from('reviews')
          .select('id, rating, comment, created_at, reviewer:users!reviews_reviewer_id_fkey(name, avatar_url)')
          .eq('seller_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const reviewList = reviewsRes.data || [];
      const avgRating =
        reviewList.length > 0
          ? reviewList.reduce((s: number, r: any) => s + r.rating, 0) / reviewList.length
          : 0;

      setProfile({
        ...profileData,
        avg_rating: avgRating,
        total_reviews: reviewList.length,
        total_sales: soldRes.count || 0,
      });
      setListings((listingsRes.data as unknown as Product[]) || []);
      setReviews(reviewList);
      setSoldCount(soldRes.count || 0);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleShare = async () => {
    const url = profile ? `${window.location.origin}/seller/${profile.id}` : window.location.href;
    if (navigator.share) {
      navigator.share({ title: profile?.name, url });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = new Date(profile.created_at).getFullYear();
  const location = [profile.city, profile.state].filter(Boolean).join(', ');

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Cover + Avatar */}
      <div className="relative">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-br from-brand-purple via-brand-blue to-brand-orange" />

        {/* Avatar */}
        <div className="absolute -bottom-14 left-4">
          <div className="relative w-28 h-28 rounded-3xl ring-4 ring-white shadow-xl overflow-hidden bg-brand-purple/10">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl font-bold text-brand-purple">
                  {profile.name?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions top-right */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={handleShare}
            className="bg-white/20 backdrop-blur-sm text-white rounded-xl p-2.5 hover:bg-white/30 transition-colors"
            aria-label="Compartilhar perfil"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>
          <Link
            href="/settings"
            className="bg-white/20 backdrop-blur-sm text-white rounded-xl p-2.5 hover:bg-white/30 transition-colors"
            aria-label="Editar perfil"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Profile info */}
      <div className="pt-16 px-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-gray-900">{profile.name}</h1>
              {profile.is_verified && (
                <CheckCircle className="w-5 h-5 text-brand-blue" />
              )}
            </div>
            {profile.bio && (
              <p className="text-gray-500 text-sm mt-1 leading-relaxed max-w-xs">{profile.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {location && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3.5 h-3.5" /> {location}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <UserCheck className="w-3.5 h-3.5" /> Membro desde {memberSince}
              </span>
            </div>
          </div>
          <Link
            href="/settings"
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Settings className="w-4 h-4" />
            Editar
          </Link>
        </div>

        {/* Rating */}
        {(profile.total_reviews || 0) > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <StarRating rating={profile.avg_rating || 0} size="sm" />
            <span className="text-sm font-semibold text-gray-700">
              {(profile.avg_rating || 0).toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">
              ({profile.total_reviews} avaliação{(profile.total_reviews || 0) !== 1 ? 'ões' : ''})
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="card p-3 text-center">
            <Package className="w-5 h-5 text-brand-purple mx-auto mb-1" />
            <p className="font-bold text-lg text-gray-900">{listings.length}</p>
            <p className="text-xs text-gray-500">Anúncios</p>
          </div>
          <div className="card p-3 text-center">
            <TrendingUp className="w-5 h-5 text-brand-orange mx-auto mb-1" />
            <p className="font-bold text-lg text-gray-900">{soldCount}</p>
            <p className="text-xs text-gray-500">Vendas</p>
          </div>
          <div className="card p-3 text-center">
            <Star className="w-5 h-5 text-brand-gold mx-auto mb-1" />
            <p className="font-bold text-lg text-gray-900">
              {(profile.avg_rating || 0).toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">Avaliação</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 mt-4">
          <Link href="/dashboard" className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
            <ShoppingBag className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/orders" className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
            <Package className="w-4 h-4" /> Pedidos
          </Link>
          <Link href="/chat" className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4" /> Chat
          </Link>
        </div>

        {/* Ver perfil público */}
        <Link
          href={`/seller/${profile.id}`}
          className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-brand-purple font-semibold border-2 border-brand-purple/20 rounded-2xl py-2.5 hover:bg-brand-purple/5 transition-colors"
        >
          <Shield className="w-4 h-4" />
          Ver meu perfil público
        </Link>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-100 px-4">
        <div className="flex gap-0">
          {[
            { id: 'listings', label: 'Anúncios', icon: Package, count: listings.length },
            { id: 'sold', label: 'Vendas', icon: TrendingUp, count: soldCount },
            { id: 'reviews', label: 'Avaliações', icon: Star, count: reviews.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-brand-purple text-brand-purple'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                  activeTab === tab.id ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 mt-4">
        {activeTab === 'listings' && (
          <>
            {listings.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-display">Nenhum anúncio ainda</p>
                <Link href="/product/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                  Criar anúncio
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {listings.map((product) => (
                  <ProductCard key={product.id} product={product} style="card" />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'sold' && (
          <div className="text-center py-16">
            {soldCount === 0 ? (
              <>
                <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-display">Nenhuma venda ainda</p>
                <p className="text-gray-300 text-sm mt-1">
                  Publique seu primeiro anúncio para começar
                </p>
              </>
            ) : (
              <>
                <TrendingUp className="w-12 h-12 text-brand-orange mx-auto mb-3" />
                <p className="font-display font-bold text-2xl text-gray-900">{soldCount}</p>
                <p className="text-gray-500 text-sm mt-1">produto{soldCount !== 1 ? 's' : ''} vendido{soldCount !== 1 ? 's' : ''}</p>
                <Link href="/orders" className="btn-primary mt-4 inline-flex">
                  Ver histórico completo
                </Link>
              </>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <>
            {reviews.length === 0 ? (
              <div className="text-center py-16">
                <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-display">Nenhuma avaliação ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <div key={review.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                        {review.reviewer?.avatar_url ? (
                          <Image
                            src={review.reviewer.avatar_url}
                            alt={review.reviewer.name}
                            width={36}
                            height={36}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-brand-purple">
                            {review.reviewer?.name?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {review.reviewer?.name || 'Usuário'}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatRelativeTime(review.created_at)}
                          </span>
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                        {review.comment && (
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            {review.comment}
                          </p>
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
  );
}
