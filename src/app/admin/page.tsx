'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Package, ShoppingCart, Video, DollarSign, HandHeart,
  TrendingUp, Zap, RefreshCw, Loader2, ArrowUpRight,
  Bell, Shield, Star, BarChart3, Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface DashboardStats {
  users: number;
  products: number;
  orders: number;
  videoJobs: number;
  notifications: number;
  featuredActive: number;
  totalRevenue: number;
  pendingEscrow: number;
  avgRating: number;
  newUsersToday: number;
  newProductsToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        usersRes, productsRes, ordersRes, videosRes,
        notificationsRes, featuredRes,
        newUsersRes, newProductsRes,
        revenueRes, escrowRes, ratingsRes,
        recentProdsRes, recentUsersRes, recentOrdersRes,
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('video_jobs').select('id', { count: 'exact', head: true }),
        supabase.from('notification_queue').select('id', { count: 'exact', head: true }),
        supabase.from('featured_products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('products').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
        supabase.from('orders').select('gross_value').eq('payment_status', 'paid'),
        supabase.from('escrow_transactions').select('amount').eq('status', 'payment_held'),
        supabase.from('reviews').select('rating'),
        supabase.from('products').select('id, title, price, status, created_at, user:users!products_user_id_fkey(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('users').select('id, name, email, type, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('id, gross_value, payment_status, created_at, product:products!orders_product_id_fkey(title)').order('created_at', { ascending: false }).limit(5),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((s, o) => s + (o.gross_value || 0), 0);
      const pendingEscrow = (escrowRes.data || []).reduce((s, e) => s + (e.amount || 0), 0);
      const ratingsList = (ratingsRes.data || []).map((r) => r.rating).filter(Boolean);
      const avgRating = ratingsList.length > 0 ? ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length : 0;

      setStats({
        users: usersRes.count || 0,
        products: productsRes.count || 0,
        orders: ordersRes.count || 0,
        videoJobs: videosRes.count || 0,
        notifications: notificationsRes.count || 0,
        featuredActive: featuredRes.count || 0,
        totalRevenue,
        pendingEscrow,
        avgRating,
        newUsersToday: newUsersRes.count || 0,
        newProductsToday: newProductsRes.count || 0,
      });

      if (recentProdsRes.data) setRecentProducts(recentProdsRes.data);
      if (recentUsersRes.data) setRecentUsers(recentUsersRes.data);
      if (recentOrdersRes.data) setRecentOrders(recentOrdersRes.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function fmt(n: number) {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  const primaryStats = stats ? [
    {
      label: 'Usuários', value: stats.users.toLocaleString('pt-BR'),
      sub: `+${stats.newUsersToday} hoje`,
      icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20',
      href: '/admin/users',
    },
    {
      label: 'Produtos Ativos', value: stats.products.toLocaleString('pt-BR'),
      sub: `+${stats.newProductsToday} hoje`,
      icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20',
      href: '/admin/products',
    },
    {
      label: 'Pedidos Total', value: stats.orders.toLocaleString('pt-BR'),
      sub: 'todos os status',
      icon: ShoppingCart, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20',
      href: '/admin/orders',
    },
    {
      label: 'Receita Total', value: fmt(stats.totalRevenue),
      sub: 'pedidos pagos',
      icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20',
      href: '/admin/payments',
    },
  ] : [];

  const secondaryStats = stats ? [
    { label: 'Escrow Pendente', value: fmt(stats.pendingEscrow), icon: Shield, color: 'text-yellow-400', href: '/admin/escrow' },
    { label: 'Em Destaque', value: stats.featuredActive.toLocaleString(), icon: Zap, color: 'text-blue-400', href: '/admin/commercial' },
    { label: 'Nota Média', value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) + ' ★' : '—', icon: Star, color: 'text-amber-400', href: '/admin/reports' },
    { label: 'Vídeos IA', value: stats.videoJobs.toLocaleString(), icon: Video, color: 'text-cyan-400', href: '/admin/videos' },
    { label: 'Notificações', value: stats.notifications.toLocaleString(), icon: Bell, color: 'text-indigo-400', href: '/admin/notifications' },
  ] : [];

  const paymentStatusLabel: Record<string, { label: string; color: string }> = {
    paid:    { label: 'Pago',      color: 'text-green-400' },
    pending: { label: 'Pendente',  color: 'text-yellow-400' },
    failed:  { label: 'Falhou',    color: 'text-red-400' },
    refunded:{ label: 'Estornado', color: 'text-gray-400' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            Atualizado às {lastRefresh.toLocaleTimeString('pt-BR')}
            {stats && <span className="text-emerald-400 flex items-center gap-1"><Activity className="w-3 h-3" /> Dados reais</span>}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-700 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && !stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 rounded-2xl p-4 border border-gray-700 animate-pulse h-24" />
          ))}
        </div>
      )}

      {/* Stats primários */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {primaryStats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className={`bg-gray-800 rounded-2xl p-4 border ${stat.bg} hover:scale-[1.02] transition-all group`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className={`w-4 h-4 ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </div>
                <div className={`font-display font-bold text-2xl text-white`}>{stat.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                <div className={`text-[10px] mt-1 ${stat.color} font-medium`}>{stat.sub}</div>
              </Link>
            ))}
          </div>

          {/* Stats secundários */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {secondaryStats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 hover:border-gray-600 transition-colors"
              >
                <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                <div className="font-bold text-white text-sm">{stat.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Tabelas recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Produtos recentes */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm">Produtos Recentes</h3>
            <Link href="/admin/products" className="text-xs text-purple-400 hover:underline">Ver todos</Link>
          </div>
          {recentProducts.length > 0 ? (
            <div className="space-y-2.5">
              {recentProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-500">{(p.user as any)?.name || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs text-white font-bold">R$ {p.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className={`text-[10px] font-bold ${p.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Nenhum produto ainda</p>
          )}
        </div>

        {/* Usuários recentes */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm">Últimos Cadastros</h3>
            <Link href="/admin/users" className="text-xs text-purple-400 hover:underline">Ver todos</Link>
          </div>
          {recentUsers.length > 0 ? (
            <div className="space-y-2.5">
              {recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">{u.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Nenhum usuário ainda</p>
          )}
        </div>

        {/* Pedidos recentes */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm">Pedidos Recentes</h3>
            <Link href="/admin/orders" className="text-xs text-purple-400 hover:underline">Ver todos</Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-2.5">
              {recentOrders.map((o: any) => {
                const ps = paymentStatusLabel[o.payment_status] || { label: o.payment_status, color: 'text-gray-400' };
                return (
                  <div key={o.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-white font-medium truncate">{(o.product as any)?.title || 'Pedido'}</p>
                      <p className={`text-[10px] font-bold ${ps.color}`}>{ps.label}</p>
                    </div>
                    <p className="text-xs text-white font-bold flex-shrink-0 ml-2">
                      R$ {o.gross_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-4">Nenhum pedido ainda</p>
          )}
        </div>
      </div>

      {/* Atalhos rápidos */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Atalhos rápidos</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Gerenciar usuários', href: '/admin/users', icon: Users },
            { label: 'Moderar produtos', href: '/admin/products', icon: Package },
            { label: 'Ver pedidos', href: '/admin/orders', icon: ShoppingCart },
            { label: 'Escrow', href: '/admin/escrow', icon: Shield },
            { label: 'Notificações', href: '/admin/notifications', icon: Bell },
            { label: 'Relatórios', href: '/admin/reports', icon: TrendingUp },
            { label: 'Doações', href: '/admin/donations', icon: HandHeart },
            { label: 'IA Precificação', href: '/admin/ai-pricing', icon: Zap },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 text-xs text-gray-300 bg-gray-700/60 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <item.icon className="w-3 h-3" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
