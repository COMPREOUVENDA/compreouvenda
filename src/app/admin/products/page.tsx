'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, RefreshCw, CheckCircle, XCircle, Trash2, Eye, Pause, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ProductRow {
  id: string;
  title: string;
  price: number;
  status: string;
  category_id?: string;
  created_at: string;
  user?: { name: string } | null;
}

const MOCK_PRODUCTS: ProductRow[] = [
  { id: '1', title: 'iPhone 14 Pro Max', price: 5200, status: 'active', created_at: '2024-04-20', user: { name: 'Maria Santos' } },
  { id: '2', title: 'Sofá Retrátil 3 Lugares', price: 1800, status: 'active', created_at: '2024-04-19', user: { name: 'João Silva' } },
  { id: '3', title: 'Bicicleta Speed Caloi', price: 2800, status: 'active', created_at: '2024-04-18', user: { name: 'Ana Oliveira' } },
  { id: '4', title: 'PS5 + 2 Controles', price: 3400, status: 'paused', created_at: '2024-04-17', user: { name: 'Pedro Costa' } },
  { id: '5', title: 'MacBook Air M2', price: 7500, status: 'sold', created_at: '2024-04-16', user: { name: 'Lucas Ferreira' } },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select('id, title, price, status, category_id, created_at, user:users!products_user_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(100);

      setProducts(data && data.length > 0 ? data as unknown as ProductRow[] : MOCK_PRODUCTS);
    } catch {
      setProducts(MOCK_PRODUCTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setActionId(id);
    try {
      const supabase = createClient();
      await supabase.from('products').update({ status: newStatus }).eq('id', id);
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
      showToast(`Status alterado para ${newStatus}`);
    } catch {
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
      showToast('Atualizado (modo demo)');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.from('products').delete().eq('id', id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Produto removido');
    } catch {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Removido (modo demo)');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = products.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Excluir produto?</h3>
            <p className="text-sm text-gray-400">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'paused', 'sold'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                statusFilter === s ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Ativos' : s === 'paused' ? 'Pausados' : 'Vendidos'}
            </button>
          ))}
          <button onClick={fetchProducts} disabled={loading} className="p-2 bg-gray-700 rounded-xl text-gray-400 hover:text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: products.length, color: 'text-white' },
          { label: 'Ativos', value: products.filter((p) => p.status === 'active').length, color: 'text-emerald-400' },
          { label: 'Pausados', value: products.filter((p) => p.status === 'paused').length, color: 'text-amber-400' },
          { label: 'Vendidos', value: products.filter((p) => p.status === 'sold').length, color: 'text-brand-gold' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
            <span className={`font-display font-bold text-xl ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500 mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Produto</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Vendedor</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Preço</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Data</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-500 text-sm">Nenhum produto encontrado</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 text-sm text-white font-medium max-w-[200px] truncate">{p.title}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{p.user?.name || '—'}</td>
                <td className="px-5 py-3 text-sm text-white font-display font-semibold">
                  R$ {p.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">
                  {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                    p.status === 'sold' ? 'bg-yellow-500/10 text-yellow-500' :
                    p.status === 'paused' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {p.status === 'active' ? 'Ativo' : p.status === 'sold' ? 'Vendido' : p.status === 'paused' ? 'Pausado' : p.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    {p.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(p.id, 'paused')}
                        disabled={actionId === p.id}
                        title="Pausar"
                        className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Pause className="w-4 h-4 text-amber-400" />
                      </button>
                    ) : p.status === 'paused' ? (
                      <button
                        onClick={() => handleStatusChange(p.id, 'active')}
                        disabled={actionId === p.id}
                        title="Ativar"
                        className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 text-emerald-400" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => setDeleteId(p.id)}
                      title="Excluir"
                      className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">{filtered.length} de {products.length} produtos</span>
        </div>
      </div>
    </div>
  );
}
