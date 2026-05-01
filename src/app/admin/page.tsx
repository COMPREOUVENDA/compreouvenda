'use client';

import { useState, useEffect } from 'react';
import { Users, Package, CreditCard, Video, ShoppingCart, DollarSign, HandHeart, Gavel, Zap, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Stats {
  users: number;
  products: number;
  orders: number;
  videoJobs: number;
  notifications: number;
}

const FALLBACK_STATS = [
  { label: 'Usuários', value: '12.847', change: '+12%', up: true, icon: Users, color: 'bg-brand-purple/10 text-brand-purple' },
  { label: 'Produtos Ativos', value: '4.231', change: '+8%', up: true, icon: Package, color: 'bg-brand-orange/10 text-brand-orange' },
  { label: 'Receita Mensal', value: 'R$ 45.2K', change: '+23%', up: true, icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-500' },
  { label: 'Vídeos Gerados', value: '1.892', change: '+31%', up: true, icon: Video, color: 'bg-brand-blue/10 text-brand-blue' },
  { label: 'Vendas do Mês', value: '856', change: '-3%', up: false, icon: ShoppingCart, color: 'bg-brand-pink/10 text-brand-pink' },
  { label: 'Doações', value: 'R$ 8.4K', change: '+45%', up: true, icon: HandHeart, color: 'bg-emerald-500/10 text-emerald-500' },
  { label: 'Leilões Ativos', value: '127', change: '+15%', up: true, icon: Gavel, color: 'bg-brand-gold/10 text-brand-gold' },
  { label: 'Ofertas Flash', value: '89', change: '+22%', up: true, icon: Zap, color: 'bg-brand-pink/10 text-brand-pink' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, productsRes, ordersRes, videosRes, recentProdsRes, recentUsersRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('video_jobs').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id, title, price, status, created_at, user:users!products_user_id_fkey(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('users').select('id, name, email, type, created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        users: usersRes.count || 0,
        products: productsRes.count || 0,
        orders: ordersRes.count || 0,
        videoJobs: videosRes.count || 0,
        notifications: 0,
      });

      if (recentProdsRes.data) setRecentProducts(recentProdsRes.data);
      if (recentUsersRes.data) setRecentUsers(recentUsersRes.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const realStats = stats ? [
    { label: 'Usuários', value: stats.users.toLocaleString('pt-BR'), change: '+' + stats.users, up: true, icon: Users, color: 'bg-brand-purple/10 text-brand-purple' },
    { label: 'Produtos Ativos', value: stats.products.toLocaleString('pt-BR'), change: 'real', up: true, icon: Package, color: 'bg-brand-orange/10 text-brand-orange' },
    { label: 'Pedidos', value: stats.orders.toLocaleString('pt-BR'), change: 'real', up: true, icon: ShoppingCart, color: 'bg-brand-pink/10 text-brand-pink' },
    { label: 'Vídeos IA', value: stats.videoJobs.toLocaleString('pt-BR'), change: 'real', up: true, icon: Video, color: 'bg-brand-blue/10 text-brand-blue' },
  ] : [];

  const displayStats = stats && stats.users > 0 ? realStats : FALLBACK_STATS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
            {stats && stats.users > 0 && <span className="ml-2 text-emerald-400">● Dados reais</span>}
          </p>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-700">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayStats.map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-2xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-bold flex items-center gap-0.5 ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <span className="font-display font-bold text-2xl text-white">{stat.value}</span>
            <span className="block text-xs text-gray-500 mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Products */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-display font-semibold text-white mb-4">Produtos Recentes</h3>
          {recentProducts.length > 0 ? (
            <div className="space-y-3">
              {recentProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                  <div>
                    <span className="text-sm text-white font-medium">{p.title}</span>
                    <span className="block text-[10px] text-gray-500">{(p.user as any)?.name || 'Vendedor'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-white font-display">R$ {p.price?.toLocaleString('pt-BR')}</span>
                    <span className={`block text-[10px] font-bold ${p.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {['iPhone 14 Pro Max', 'MacBook Air M2', 'PS5 + 2 Controles', 'Sofá Retrátil'].map((name, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                  <div>
                    <span className="text-sm text-white font-medium">{name}</span>
                    <span className="block text-[10px] text-gray-500">Vendedor demo</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">Ativo</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-display font-semibold text-white mb-4">Últimos Cadastros</h3>
          {recentUsers.length > 0 ? (
            <div className="space-y-3">
              {recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-white font-medium">{u.name}</span>
                    <span className="block text-[10px] text-gray-500">{u.email}</span>
                  </div>
                  <span className="text-[10px] text-brand-purple font-bold bg-brand-purple/10 px-2 py-0.5 rounded-full">{u.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum usuário cadastrado ainda</p>
          )}
        </div>
      </div>
    </div>
  );
}
