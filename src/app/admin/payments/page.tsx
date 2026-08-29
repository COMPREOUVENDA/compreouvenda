'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Loader2, RefreshCw, AlertTriangle, CreditCard, TrendingUp, ShieldCheck, Undo2,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Payment {
  id: string;
  product_title: string;
  buyer_name: string;
  seller_name: string;
  gross_value: number;
  platform_fee: number;
  gateway_fee: number;
  donation_value: number;
  seller_net_value: number;
  refund_amount: number;
  payment_status: string;
  split_status: string | null;
  escrow_status: string | null;
  provider: string;
  method: string | null;
  card_brand: string | null;
  installments: number | null;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

interface Metrics {
  gmv: number;
  revenue: number;
  gatewayFees: number;
  donated: number;
  sellerPayouts: number;
  heldAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  counts: Record<string, number>;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-gray-500/10 text-gray-400' },
  paid: { label: 'Pago', color: 'bg-brand-blue/10 text-brand-blue' },
  held: { label: 'Retido', color: 'bg-amber-500/10 text-amber-500' },
  released: { label: 'Liberado', color: 'bg-emerald-500/10 text-emerald-500' },
  refunded: { label: 'Reembolsado', color: 'bg-brand-purple/10 text-brand-purple' },
  disputed: { label: 'Contestado', color: 'bg-red-500/10 text-red-500' },
  failed: { label: 'Falhou', color: 'bg-red-500/10 text-red-500' },
};

const METHOD_LABEL: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
};

const FILTERS = ['all', 'pending', 'paid', 'held', 'released', 'refunded', 'disputed', 'failed'] as const;

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    gmv: 0, revenue: 0, gatewayFees: 0, donated: 0, sellerPayouts: 0,
    heldAmount: 0, pendingAmount: 0, refundedAmount: 0, counts: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ payments: Payment[]; metrics: Metrics }>(
        `/api/admin/payments?status=${filter}`
      );
      setPayments(data.payments);
      setMetrics(data.metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pagamentos');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-5">
      {/* Indicadores financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> GMV
          </p>
          <p className="font-display font-bold text-2xl text-white">{brl(metrics.gmv)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">volume transacionado</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500">Receita da plataforma</p>
          <p className="font-display font-bold text-2xl text-emerald-500">{brl(metrics.revenue)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {metrics.gmv > 0 ? `${((metrics.revenue / metrics.gmv) * 100).toFixed(1)}% do GMV` : 'sem vendas'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Retido em escrow
          </p>
          <p className="font-display font-bold text-2xl text-amber-500">{brl(metrics.heldAmount)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{metrics.counts.held || 0} pedidos</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Undo2 className="w-3.5 h-3.5" /> Reembolsado
          </p>
          <p className="font-display font-bold text-2xl text-brand-purple">{brl(metrics.refundedAmount)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">
            {metrics.counts.refunded || 0} reembolsos · {metrics.counts.disputed || 0} contestações
          </p>
        </div>
      </div>

      {/* Composição do valor transacionado */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
        <h3 className="text-xs text-gray-500 mb-3">Para onde vai o valor transacionado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            ['Repasse ao vendedor', metrics.sellerPayouts, 'text-white'],
            ['Taxa da plataforma', metrics.revenue, 'text-emerald-500'],
            ['Taxa do gateway', metrics.gatewayFees, 'text-gray-400'],
            ['Doações', metrics.donated, 'text-brand-orange'],
          ] as const).map(([label, value, color]) => (
            <div key={label}>
              <p className={`font-display font-semibold text-lg ${color}`}>{brl(value)}</p>
              <p className="text-[11px] text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-brand-purple text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {f === 'all' ? 'Todos' : STATUS_MAP[f]?.label}
            {f !== 'all' && metrics.counts[f] > 0 && (
              <span className="ml-1.5 opacity-60">{metrics.counts[f]}</span>
            )}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-blue" /> Pagamentos
            <span className="text-xs font-normal text-gray-500">({payments.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-16 px-5">
            <CreditCard className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Nenhum pagamento {filter !== 'all' ? 'com esse status' : 'registrado'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Cada compra finalizada no checkout aparece aqui com a composição do valor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Produto</th>
                  <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Comprador</th>
                  <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Vendedor</th>
                  <th className="text-left px-5 py-3 font-medium">Bruto</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Taxa</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Método</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Data</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 max-w-[180px]">
                      <Link
                        href={`/admin/orders?id=${p.id}`}
                        className="text-sm text-white hover:text-brand-blue truncate block"
                      >
                        {p.product_title}
                      </Link>
                      {p.donation_value > 0 && (
                        <span className="text-[10px] text-brand-orange">
                          doa {brl(p.donation_value)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400 hidden lg:table-cell">{p.buyer_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-400 hidden lg:table-cell">{p.seller_name}</td>
                    <td className="px-5 py-3 text-sm text-white font-display font-semibold whitespace-nowrap">
                      {brl(p.gross_value)}
                    </td>
                    <td className="px-5 py-3 text-sm text-emerald-500 hidden md:table-cell whitespace-nowrap">
                      {brl(p.platform_fee)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell whitespace-nowrap">
                      {p.method ? METHOD_LABEL[p.method] || p.method : p.provider}
                      {p.installments && p.installments > 1 && ` ${p.installments}x`}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                      {formatDate(p.paid_at || p.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_MAP[p.payment_status]?.color ?? 'bg-gray-500/10 text-gray-400'}`}>
                        {STATUS_MAP[p.payment_status]?.label ?? p.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
