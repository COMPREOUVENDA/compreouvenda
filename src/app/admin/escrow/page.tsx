'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, DollarSign, Clock, AlertTriangle,
  CheckCircle2, Loader2, Eye, Unlock, Scale,
  XCircle, RefreshCw, Filter,
} from 'lucide-react';

interface EscrowRow {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  held_at: string | null;
  auto_release_at: string | null;
  buyer_name: string;
  seller_name: string;
  dispute_id: string | null;
}

interface Dispute {
  id: string;
  order_id: string;
  reason: string;
  description: string;
  status: string;
  opened_by_name: string;
  created_at: string;
}

interface Metrics {
  total_held: number;
  count_held: number;
  count_disputes: number;
  avg_release_hours: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending_payment: { label: 'Aguard. Pgto', color: 'bg-gray-500/10 text-gray-400', icon: Clock },
  payment_held: { label: 'Retido', color: 'bg-amber-500/10 text-amber-400', icon: ShieldCheck },
  shipped: { label: 'Enviado', color: 'bg-blue-500/10 text-blue-400', icon: Clock },
  delivered_pending_confirmation: { label: 'Aguard. Confirmação', color: 'bg-[#5B2D8E]/20 text-purple-400', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  payment_released: { label: 'Liberado', color: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 },
  disputed: { label: 'Disputa', color: 'bg-red-500/10 text-red-400', icon: AlertTriangle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-600/20 text-gray-500', icon: XCircle },
};

function formatPrice(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

type ModalState =
  | { type: 'release'; orderId: string }
  | { type: 'dispute'; dispute: Dispute }
  | null;

export default function AdminEscrowPage() {
  const [escrows, setEscrows] = useState<EscrowRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [resolveResolution, setResolveResolution] = useState<'release_seller' | 'refund_buyer' | 'split'>('release_seller');
  const [splitPercent, setSplitPercent] = useState(50);
  const [adminNotes, setAdminNotes] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Fetch metrics via RPC
      const { data: metricsData } = await supabase.rpc('get_escrow_metrics');
      if (metricsData) setMetrics(metricsData as Metrics);

      // Fetch escrow transactions with order details
      let query = supabase
        .from('escrow_transactions')
        .select(`
          id, order_id, amount, status, held_at, auto_release_at,
          order:orders!escrow_transactions_order_id_fkey(
            buyer:users!orders_buyer_id_fkey(name),
            seller:users!orders_seller_id_fkey(name),
            dispute_id
          )
        `)
        .order('held_at', { ascending: false })
        .limit(100);

      if (filterStatus) query = query.eq('status', filterStatus);

      const { data: rawEscrows } = await query;

      if (rawEscrows) {
        const mapped = rawEscrows.map((e: Record<string, unknown>) => {
          const ord = e.order as Record<string, unknown> | null;
          const buyer = ord?.buyer as Record<string, string> | null;
          const seller = ord?.seller as Record<string, string> | null;
          return {
            id: e.id as string,
            order_id: e.order_id as string,
            amount: e.amount as number,
            status: e.status as string,
            held_at: e.held_at as string | null,
            auto_release_at: e.auto_release_at as string | null,
            buyer_name: buyer?.name ?? 'Desconhecido',
            seller_name: seller?.name ?? 'Desconhecido',
            dispute_id: ord?.dispute_id as string | null,
          };
        });
        setEscrows(mapped);
      }

      // Fetch open disputes
      const { data: rawDisputes } = await supabase
        .from('disputes')
        .select(`
          id, order_id, reason, description, status, created_at,
          opener:users!disputes_opened_by_fkey(name)
        `)
        .in('status', ['open', 'under_review'])
        .order('created_at', { ascending: false });

      if (rawDisputes) {
        setDisputes(rawDisputes.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          order_id: d.order_id as string,
          reason: d.reason as string,
          description: d.description as string,
          status: d.status as string,
          opened_by_name: (d.opener as Record<string, string> | null)?.name ?? 'Desconhecido',
          created_at: d.created_at as string,
        })));
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRelease = async () => {
    if (modal?.type !== 'release') return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/escrow/admin/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: modal.orderId, reason: releaseReason }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) showToast(json.error ?? 'Erro', 'error');
      else { showToast('Pagamento liberado!', 'success'); setModal(null); await fetchData(); }
    } catch { showToast('Erro de conexão', 'error'); }
    setActionLoading(false);
  };

  const handleResolveDispute = async () => {
    if (modal?.type !== 'dispute') return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/escrow/admin/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disputeId: modal.dispute.id,
          resolution: resolveResolution,
          splitSellerPercent: resolveResolution === 'split' ? splitPercent : undefined,
          adminNotes,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) showToast(json.error ?? 'Erro', 'error');
      else { showToast('Disputa resolvida!', 'success'); setModal(null); await fetchData(); }
    } catch { showToast('Erro de conexão', 'error'); }
    setActionLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#5B2D8E]" />
          <h1 className="font-display font-bold text-xl text-white">Escrow</h1>
        </div>
        <button onClick={() => fetchData()} className="p-2 hover:bg-gray-700 rounded-xl">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Retido', value: metrics ? formatPrice(metrics.total_held) : '—', icon: DollarSign, color: 'text-[#F5921E]' },
          { label: 'Pedidos em Escrow', value: metrics?.count_held ?? '—', icon: ShieldCheck, color: 'text-[#5B2D8E]' },
          { label: 'Disputas Abertas', value: metrics?.count_disputes ?? '—', icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Tempo Médio (h)', value: metrics ? `${metrics.avg_release_hours}h` : '—', icon: Clock, color: 'text-emerald-400' },
        ].map((m) => (
          <div key={m.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <m.icon className={`w-5 h-5 ${m.color} mb-2`} />
            <p className={`font-display font-bold text-xl ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Disputes panel */}
      {disputes.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-red-500/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-white text-sm">Disputas Abertas ({disputes.length})</h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {disputes.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{d.reason.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 truncate">por {d.opened_by_name} • {formatDate(d.created_at)}</p>
                </div>
                <button
                  onClick={() => {
                    setResolveResolution('release_seller');
                    setAdminNotes('');
                    setModal({ type: 'dispute', dispute: d });
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#5B2D8E] hover:bg-[#4a2470] text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  Resolver
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5B2D8E]"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Escrow table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="font-display font-semibold text-white">Transações Escrow</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#5B2D8E] animate-spin" />
          </div>
        ) : escrows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <ShieldCheck className="w-10 h-10 text-gray-600" />
            <p className="text-gray-500 text-sm">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Pedido', 'Comprador', 'Vendedor', 'Valor', 'Status', 'Retido em', 'Auto-libera', 'Ações'].map((h) => (
                    <th key={h} className="text-left text-xs text-gray-500 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {escrows.map((row) => {
                  const cfg = statusConfig[row.status] ?? statusConfig.pending_payment;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={row.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-xs text-white font-mono">#{row.order_id.slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.buyer_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{row.seller_name}</td>
                      <td className="px-4 py-3 text-sm text-white font-display font-semibold">{formatPrice(row.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(row.held_at)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {row.auto_release_at ? (
                          <span className={new Date(row.auto_release_at) < new Date() ? 'text-red-400' : 'text-gray-500'}>
                            {formatDate(row.auto_release_at)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a
                            href={`/orders/${row.order_id}`}
                            className="p-1.5 hover:bg-gray-600 rounded-lg"
                            title="Ver pedido"
                          >
                            <Eye className="w-4 h-4 text-gray-400" />
                          </a>
                          {['payment_held', 'shipped', 'delivered_pending_confirmation', 'disputed'].includes(row.status) && (
                            <button
                              onClick={() => {
                                setReleaseReason('');
                                setModal({ type: 'release', orderId: row.order_id });
                              }}
                              className="p-1.5 hover:bg-gray-600 rounded-lg"
                              title="Liberar pagamento"
                            >
                              <Unlock className="w-4 h-4 text-[#F5921E]" />
                            </button>
                          )}
                          {row.dispute_id && (
                            <button
                              onClick={() => {
                                const d = disputes.find((x) => x.order_id === row.order_id);
                                if (d) { setResolveResolution('release_seller'); setAdminNotes(''); setModal({ type: 'dispute', dispute: d }); }
                              }}
                              className="p-1.5 hover:bg-gray-600 rounded-lg"
                              title="Ver disputa"
                            >
                              <Scale className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal — Release */}
      {modal?.type === 'release' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Unlock className="w-5 h-5 text-[#F5921E]" />
              <h2 className="font-display font-bold text-white">Liberar Pagamento</h2>
            </div>
            <p className="text-sm text-gray-400">
              Pedido <span className="font-mono text-white">#{modal.orderId.slice(-8).toUpperCase()}</span>.
              O pagamento será liberado imediatamente ao vendedor.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Motivo (obrigatório)</label>
              <input
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                placeholder="Ex: Comprador confirmou por telefone"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRelease}
                disabled={actionLoading || !releaseReason.trim()}
                className="flex-1 py-2.5 bg-[#F5921E] hover:bg-[#d97d1a] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                Liberar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Dispute */}
      {modal?.type === 'dispute' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-[#5B2D8E]" />
              <h2 className="font-display font-bold text-white">Resolver Disputa</h2>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-3 space-y-1">
              <p className="text-xs text-gray-500">Aberta por <span className="text-white">{modal.dispute.opened_by_name}</span></p>
              <p className="text-sm font-medium text-white">{modal.dispute.reason.replace(/_/g, ' ')}</p>
              <p className="text-xs text-gray-400">{modal.dispute.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Resolução</label>
              <div className="space-y-2">
                {[
                  { value: 'release_seller', label: 'Liberar para o vendedor', icon: CheckCircle2, color: 'text-emerald-400' },
                  { value: 'refund_buyer', label: 'Estornar ao comprador', icon: XCircle, color: 'text-red-400' },
                  { value: 'split', label: 'Dividir (split)', icon: Scale, color: 'text-[#F5921E]' },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${resolveResolution === opt.value ? 'border-[#5B2D8E] bg-[#5B2D8E]/10' : 'border-gray-700 hover:border-gray-600'}`}>
                    <input
                      type="radio"
                      name="resolution"
                      value={opt.value}
                      checked={resolveResolution === opt.value}
                      onChange={() => setResolveResolution(opt.value as typeof resolveResolution)}
                      className="sr-only"
                    />
                    <opt.icon className={`w-4 h-4 ${opt.color}`} />
                    <span className="text-sm text-white">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {resolveResolution === 'split' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">% para o vendedor: {splitPercent}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  className="w-full accent-[#5B2D8E]"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% vendedor</span>
                  <span>100% vendedor</span>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Notas do admin</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Justificativa da decisão..."
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5B2D8E] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#5B2D8E] hover:bg-[#4a2470] disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
                Resolver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
