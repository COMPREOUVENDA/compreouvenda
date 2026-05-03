'use client';

import { useState, useEffect } from 'react';
import {
  Package, ShoppingBag, Heart, Video, Users, HandHeart, TrendingUp,
  Settings, Bell, Star, Store, UserCheck, Percent, Loader2,
  CheckCircle, Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useProducts } from '@/hooks/useProducts';
import { useFavorites } from '@/hooks/useFavorites';
import { useOrders } from '@/hooks/useOrders';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';
import StarRating from '@/components/ui/StarRating';
import type { Product, Order } from '@/types';
import { MOCK_PRODUCTS } from '@/lib/constants';

const supabase = createClient();

const TABS = [
  { id: 'listings', label: 'Anúncios', icon: Package },
  { id: 'sold', label: 'Vendidos', icon: TrendingUp },
  { id: 'purchases', label: 'Compras', icon: ShoppingBag },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
  { id: 'videos', label: 'Vídeos', icon: Video },
  { id: 'commissions', label: 'Comissões', icon: Users },
  { id: 'donations', label: 'Doações', icon: HandHeart },
  { id: 'settings', label: 'Config', icon: Settings },
];

function OrderMiniCard({ order }: { order: Order }) {
  const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
  const image = product?.images?.[0]?.url || '';

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    paid: 'bg-emerald-50 text-emerald-600',
    held: 'bg-brand-blue/10 text-brand-blue',
    released: 'bg-emerald-100 text-emerald-700',
    refunded: 'bg-gray-100 text-gray-500',
    failed: 'bg-red-50 text-red-500',
  };
  const statusLabels: Record<string, string> = {
    pending: 'Pendente', paid: 'Pago', held: 'Retido',
    released: 'Liberado', refunded: 'Reembolsado', failed: 'Falhou',
  };

  return (
    <div className="flex items-center gap-3 py-3 border-t border-gray-100 first:border-t-0">
      <div
        className="w-12 h-12 rounded-xl bg-cover bg-center bg-gray-100 flex-shrink-0"
        style={image ? { backgroundImage: `url(${image})` } : {}}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product?.title || 'Produto'}
        </p>
        <p className="text-xs text-gray-400">{formatRelativeTime(order.created_at)}</p>
      </div>
      <div className="text-right">
        <span className="font-display font-bold text-brand-purple text-sm">
          {formatPrice(order.gross_value)}
        </span>
        <span className={`block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${statusColors[order.payment_status] || 'bg-gray-100 text-gray-500'}`}>
          {statusLabels[order.payment_status] || order.payment_status}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('listings');
  const [sellerMode, setSellerMode] = useState<'owner' | 'commissioned' | null>(null);
  const [donationPercent, setDonationPercent] = useState(2);
  const [showSellerSetup, setShowSellerSetup] = useState(true);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({ name: '', phone: '', city: '', state: '' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Data
  const [userListings, setUserListings] = useState<Product[]>([]);
  const [soldListings, setSoldListings] = useState<Product[]>([]);
  const [commissions, setCommissions] = useState<Order[]>([]);
  const [userRating, setUserRating] = useState({ average: 4.9, count: 47 });
  const [loadingListings, setLoadingListings] = useState(false);

  const { user } = useAuthStore();
  const { products: allProducts } = useProducts();
  const { favorites } = useFavorites();
  const { orders, sales, getMyOrders, getMySales } = useOrders();

  // Profile initial data
  useEffect(() => {
    if (user) {
      setSettingsForm({
        name: user.name || '',
        phone: user.phone || '',
        city: user.city || '',
        state: user.state || '',
      });
    }
  }, [user]);

  // Load user listings & sold
  useEffect(() => {
    const loadListings = async () => {
      setLoadingListings(true);
      try {
        if (!user) {
          setUserListings((MOCK_PRODUCTS as Product[]).slice(0, 4));
          setSoldListings([]);
          return;
        }
        const { data } = await supabase
          .from('products')
          .select(`*, images:product_images(id, url, position, label), user:users!products_user_id_fkey(id, name, avatar_url, city, state), category:categories!products_category_id_fkey(id, name, icon, slug)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!data || data.length === 0) {
          setUserListings((MOCK_PRODUCTS as Product[]).slice(0, 4));
          setSoldListings([]);
        } else {
          setUserListings((data as Product[]).filter((p) => p.status !== 'sold'));
          setSoldListings((data as Product[]).filter((p) => p.status === 'sold'));
        }
      } finally {
        setLoadingListings(false);
      }
    };
    loadListings();
  }, [user]);

  // Load orders when tab changes
  useEffect(() => {
    if (activeTab === 'purchases') getMyOrders();
    if (activeTab === 'sold') getMySales();
    if (activeTab === 'commissions') {
      getMyOrders().then((data) => {
        setCommissions((data || []).filter((o) => o.reseller_id === user?.id));
      });
    }
  }, [activeTab, getMyOrders, getMySales, user]);

  const saveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    try {
      await supabase
        .from('users')
        .update({
          name: settingsForm.name,
          phone: settingsForm.phone,
          city: settingsForm.city,
          state: settingsForm.state,
        })
        .eq('id', user.id);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } finally {
      setSettingsSaving(false);
    }
  };

  const displayName = user?.name || 'Usuário';
  const displayCity = user?.city || 'São Paulo';
  const displayState = user?.state || 'SP';

  const statsData = [
    { label: 'Anúncios', value: String(userListings.length), color: 'bg-brand-purple/10 text-brand-purple' },
    { label: 'Vendas', value: String(sales.length || soldListings.length), color: 'bg-brand-orange/10 text-brand-orange' },
    {
      label: 'Comissões',
      value: formatPrice(commissions.reduce((s, o) => s + o.reseller_commission_value, 0)),
      color: 'bg-brand-blue/10 text-brand-blue',
    },
    {
      label: 'Doações',
      value: formatPrice([...orders, ...sales].reduce((s, o) => s + o.donation_value, 0)),
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Seller Profile Setup */}
      {showSellerSetup && (
        <div className="card-elevated p-6 mb-6 border-2 border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-gray-900">Como você deseja vender?</h2>
            {sellerMode && (
              <button onClick={() => setShowSellerSetup(false)} className="text-xs text-brand-purple font-semibold hover:underline">
                Salvar e fechar
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-5">Escolha seu perfil de vendas na plataforma</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => setSellerMode('owner')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${sellerMode === 'owner' ? 'border-brand-purple bg-brand-purple/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <Store className={`w-6 h-6 mb-2 ${sellerMode === 'owner' ? 'text-brand-purple' : 'text-gray-400'}`} />
              <span className="font-display font-semibold text-sm block">Vender como Proprietário</span>
              <span className="text-xs text-gray-400 mt-1 block">Venda seus próprios produtos diretamente na plataforma</span>
            </button>

            <button
              onClick={() => setSellerMode('commissioned')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${sellerMode === 'commissioned' ? 'border-brand-orange bg-brand-orange/10' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <UserCheck className={`w-6 h-6 mb-2 ${sellerMode === 'commissioned' ? 'text-brand-orange' : 'text-gray-400'}`} />
              <span className="font-display font-semibold text-sm block">Vender como Comissionado</span>
              <span className="text-xs text-gray-400 mt-1 block">Revenda produtos de terceiros e ganhe comissão sobre cada venda</span>
            </button>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <HandHeart className="w-5 h-5 text-emerald-600" />
              <span className="font-display font-semibold text-sm text-emerald-800">Ofertar percentual a instituições</span>
            </div>
            <p className="text-xs text-emerald-600/70 mb-3">Defina o percentual do valor líquido que será doado a instituições beneficentes</p>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} step={1} value={donationPercent}
                onChange={(e) => setDonationPercent(Number(e.target.value))}
                className="flex-1 accent-emerald-500 h-2"
              />
              <div className="flex items-center gap-1 bg-white rounded-xl px-3 py-1.5 border border-emerald-200 min-w-[70px] justify-center">
                <Percent className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-display font-bold text-emerald-700">{donationPercent}</span>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-emerald-500/70 px-1">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>

          {sellerMode && (
            <div className="mt-4 p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-brand-purple">
                  {sellerMode === 'owner' ? '🏪 Proprietário' : '🤝 Comissionado'}
                </span>
                {' · '}Doação de <span className="font-bold text-emerald-600">{donationPercent}%</span> por venda
              </p>
            </div>
          )}
        </div>
      )}

      {/* Profile header */}
      <div className="card-elevated p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white font-display font-bold text-2xl">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-gray-900">{displayName}</h1>
              {user?.is_pro && (
                <span className="bg-brand-gold text-white text-[10px] font-bold px-2 py-0.5 rounded">PRO</span>
              )}
            </div>
            <p className="text-sm text-gray-400">{displayCity}, {displayState} · Membro desde Jan 2024</p>
            <div className="flex items-center gap-1 mt-1">
              <StarRating rating={userRating.average} size="sm" />
              <span className="text-sm font-semibold">{userRating.average}</span>
              <span className="text-xs text-gray-400">({userRating.count} avaliações)</span>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-xl relative">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {statsData.map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-3 text-center ${stat.color}`}>
              <span className="block font-display font-bold text-lg">{stat.value}</span>
              <span className="text-[10px] font-medium opacity-70">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-4 -mx-4 px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/25'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Listings */}
      {activeTab === 'listings' && (
        <div>
          {loadingListings ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : userListings.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-display">Nenhum anúncio ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {userListings.map((p) => (
                <ProductCard key={p.id} product={p} style="card" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Sold */}
      {activeTab === 'sold' && (
        <div>
          {loadingListings ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
            </div>
          ) : soldListings.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-display">Nenhum produto vendido ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {soldListings.map((p) => (
                <ProductCard key={p.id} product={p} style="card" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Purchases */}
      {activeTab === 'purchases' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Compras</h3>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Nenhuma compra ainda</p>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <OrderMiniCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Favorites */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-display">Nenhum favorito ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {favorites.map((p) => (
                <ProductCard key={p.id} product={p} style="card" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Videos */}
      {activeTab === 'videos' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Meus Vídeos IA</h3>
          <div className="grid grid-cols-2 gap-3">
            {userListings.filter((p) => p.video_status === 'ready').slice(0, 4).map((p) => (
              <div key={p.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-200">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${p.video_thumbnail || p.images?.[0]?.url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-semibold truncate">{p.title}</p>
                  <span className="text-white/60 text-[10px]">20s · Modelo</span>
                </div>
                <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Pronto</span>
              </div>
            ))}
            {userListings.filter((p) => p.video_status === 'ready').length === 0 && (
              <div className="col-span-2 text-center py-12">
                <Video className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhum vídeo gerado ainda</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Commissions */}
      {activeTab === 'commissions' && (
        <div className="space-y-3">
          <div className="card-elevated p-5">
            <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Comissões</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <span className="text-xs text-amber-600">Pendente</span>
                <span className="block font-display font-bold text-amber-600">
                  {formatPrice(commissions.filter((o) => o.payment_status === 'pending').reduce((s, o) => s + o.reseller_commission_value, 0))}
                </span>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <span className="text-xs text-emerald-600">Aprovado</span>
                <span className="block font-display font-bold text-emerald-600">
                  {formatPrice(commissions.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.reseller_commission_value, 0))}
                </span>
              </div>
              <div className="bg-brand-blue/10 rounded-xl p-3 text-center">
                <span className="text-xs text-brand-blue">Total</span>
                <span className="block font-display font-bold text-brand-blue">
                  {formatPrice(commissions.reduce((s, o) => s + o.reseller_commission_value, 0))}
                </span>
              </div>
            </div>

            {commissions.length === 0 ? (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhuma comissão ainda</p>
                <p className="text-xs text-gray-300 mt-1">Compartilhe links de produtos com ?ref=seu_id para ganhar comissão</p>
              </div>
            ) : (
              commissions.map((order) => {
                const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
                return (
                  <div key={order.id} className="flex items-center justify-between py-3 border-t border-gray-100">
                    <div>
                      <span className="font-medium text-sm text-gray-900">{product?.title || 'Produto'}</span>
                      <span className="block text-xs text-gray-400">
                        Comissão: {formatPrice(order.reseller_commission_value)}
                      </span>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      order.payment_status === 'paid'
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-amber-600 bg-amber-50'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Donations */}
      {activeTab === 'donations' && (
        <div className="card-elevated p-5">
          <h3 className="font-display font-semibold text-gray-900 mb-4">Minhas Doações</h3>
          <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-center">
            <HandHeart className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-display font-bold text-2xl text-emerald-600">
              {formatPrice([...orders, ...sales].reduce((s, o) => s + o.donation_value, 0))}
            </span>
            <p className="text-xs text-emerald-600/70 mt-1">Total doado através das suas vendas</p>
          </div>
          {[...orders, ...sales].filter((o) => o.donation_value > 0).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Nenhuma doação ainda</p>
            </div>
          ) : (
            [...orders, ...sales].filter((o) => o.donation_value > 0).map((order) => {
              const product = (MOCK_PRODUCTS as Product[]).find((p) => p.id === order.product_id);
              return (
                <div key={order.id} className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div>
                    <span className="font-medium text-sm text-gray-900">Instituição</span>
                    <span className="block text-xs text-gray-400">
                      Venda: {product?.title || 'Produto'} · {formatRelativeTime(order.created_at)}
                    </span>
                  </div>
                  <span className="font-display font-bold text-emerald-600">
                    {formatPrice(order.donation_value)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="card-elevated p-5 space-y-4">
          <h3 className="font-display font-semibold text-gray-900 mb-2">Configurações do Perfil</h3>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nome completo</label>
            <input
              type="text"
              value={settingsForm.name}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
              className="input-field w-full"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Telefone</label>
            <input
              type="tel"
              value={settingsForm.phone}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="input-field w-full"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Cidade</label>
              <input
                type="text"
                value={settingsForm.city}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, city: e.target.value }))}
                className="input-field w-full"
                placeholder="São Paulo"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Estado</label>
              <input
                type="text"
                value={settingsForm.state}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, state: e.target.value }))}
                className="input-field w-full"
                placeholder="SP"
                maxLength={2}
              />
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={settingsSaving}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {settingsSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : settingsSaved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {settingsSaving ? 'Salvando...' : settingsSaved ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  );
}
