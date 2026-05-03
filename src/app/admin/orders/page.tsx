'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OrderStatus = 'pending' | 'paid' | 'held' | 'released' | 'refunded' | 'disputed' | 'failed';

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  gross_value: number;
  payment_status: OrderStatus;
  delivery_status: string;
  created_at: string;
  buyer?: { name: string; email: string } | null;
  seller?: { name: string } | null;
  product?: { title: string } | null;
}

const STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending:  { label: 'Pendente',    color: 'bg-gray-500/10 text-gray-400' },
  paid:     { label: 'Pago',        color: 'bg-brand-blue/10 text-brand-blue' },
  held:     { label: 'Retido',      color: 'bg-amber-500/10 text-amber-500' },
  released: { label: 'Liberado',    color: 'bg-emerald-500/10 text-emerald-500' },
  refunded: { label: 'Reembolsado', color: 'bg-brand-purple/10 text-brand-purple' },
  disputed: { label: 'Contestado',  color: 'bg-red-500/10 text-red-500' },
  failed:   { label: 'Falhou',      color: 'bg-red-500/10 text-red-400' },
};

const MOCK_ORDERS: Order[] = [
  { id: '1', buyer_id: '', seller_id: '', product_id: '', gross_value: 5200, payment_status: 'released', delivery_status: 'delivered', created_at: '2024-04-20', buyer: { name: 'Ana Oliveira', email: 'ana@email.com' }, seller: { name: 'Maria Santos' }, product: { title: 'iPhone 14 Pro Max' } },
  { id: '2', buyer_id: '', seller_id: '', product_id: '', gross_value: 1800, payment_status: 'held',     delivery_status: 'in_transit', created_at: '2024-04-19', buyer: { name: 'Carlos Lima',   email: 'carlos@email.com' }, seller: { name: 'João Silva' }, product: { title: 'Sofá Retrátil' } },
  { id: '3', buyer_id: '', seller_id: '', product_id: '', gross_value: 3400, payment_status: 'paid',     delivery_status: 'pending',    created_at: '2024-04-19', buyer: { name: 'Fernanda',      email: 'fer@email.com' }, seller: { name: 'Pedro Costa' }, product: { title: 'PS5 + 2 Controles' } },
  { id: '4', buyer_id: '', seller_id: '', product_id: '', gross_value: 7500, payment_status: 'disputed', delivery_status: 'delivered',  created_at: '2024-04-18', buyer: { name: 'Bruno',         email: 'bruno@email.com' }, seller: { name: 'Lucas' }, product: { title: 'MacBook Air M2' } },
  { id: '5', buyer_id: '', seller_id: '', product_id: '', gross_value: 2800, payment_status: 'pending',  delivery_status: 'pending',    created_at: '2024-04-18', buyer: { name: 'Julia',         email: 'julia@email.com' }, seller: { name: 'Ana Oliveira' }, product: { title: 'Bicicleta Speed' } },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('orders')
        .select(`
          id, buyer_id, seller_id, product_id, gross_value,
          payment_status, delivery_status, created_at,
          buyer:users!orders_buyer_id_fkey(name, email),
          seller:users!orders_seller_id_fkey(name),
          product:products!orders_product_id_fkey(title)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        setOrders(data as unknown as Order[]);
      } else {
        setOrders(MOCK_ORDERS);
      }
    } catch {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const supabase = createClient();
      await supabase.from('orders').update({ payment_status: newStatus }).eq('id', orderId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, payment_status: newStatus } : o));
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.payment_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.product?.title?.toLowerCase().includes(q) ||
        o.buyer?.name?.toLowerCase().includes(q) ||
        o.buyer?.email?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por produto, comprador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'paid', 'held', 'released', 'disputed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                statusFilter === s ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Todos' : STATUS_MAP[s as OrderStatus]?.label || s}
            </button>
          ))}
          <button onClick={fetchOrders} disabled={loading} className="p-2 bg-gray-700 rounded-xl text-gray-400 hover:text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: orders.length, color: 'text-white' },
          { label: 'Pendentes', value: orders.filter((o) => o.payment_status === 'pending').length, color: 'text-gray-400' },
          { label: 'Pagos', value: orders.filter((o) => o.payment_status === 'paid' || o.payment_status === 'released').length, color: 'text-emerald-400' },
          { label: 'Contestações', value: orders.filter((o) => o.payment_status === 'disputed').length, color: 'text-red-400' },
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
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Pedido</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Produto</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Comprador</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Vendedor</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Valor</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Alterar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">Nenhum pedido encontrado</td></tr>
            ) : filtered.map((order) => (
              <tr key={order.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 text-sm text-white font-mono">#{order.id.slice(0, 8)}</td>
                <td className="px-5 py-3 text-sm text-gray-300 hidden md:table-cell max-w-[180px] truncate">{order.product?.title || '—'}</td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  <span className="text-sm text-gray-300">{order.buyer?.name || '—'}</span>
                  <span className="block text-[10px] text-gray-500">{order.buyer?.email}</span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden lg:table-cell">{order.seller?.name || '—'}</td>
                <td className="px-5 py-3 text-sm text-white font-display font-semibold">
                  R$ {order.gross_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_MAP[order.payment_status]?.color || ''}`}>
                    {STATUS_MAP[order.payment_status]?.label || order.payment_status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="relative">
                    <select
                      value={order.payment_status}
                      disabled={updatingId === order.id}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className="bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-purple/50 disabled:opacity-50"
                    >
                      {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
