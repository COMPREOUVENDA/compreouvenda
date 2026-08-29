'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  GitBranch, Loader2, RefreshCw, AlertTriangle, ChevronDown,
  Store, Building2, Heart, Users2, CircleDashed,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Leg {
  recipient_type: 'seller' | 'reseller' | 'charity' | 'platform';
  amount: number;
  status: string;
  provider_split_id: string | null;
  planned: boolean;
}

interface Split {
  id: string;
  product_title: string;
  buyer_name: string;
  seller_name: string;
  gross_value: number;
  gateway_fee: number;
  seller_net_value: number;
  platform_fee: number;
  donation_value: number;
  reseller_commission_value: number;
  payment_status: string;
  split_status: string;
  legs: Leg[];
  legs_executed: number;
  legs_planned: number;
  planned_total: number;
  executed_total: number;
  residual: number;
  created_at: string;
}

interface Metrics {
  volume: number; platform: number; seller: number;
  charity: number; reseller: number; gateway: number;
  counts: Record<string, number>;
  missingLegs: number; missingAmount: number; inconsistent: number;
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Concluído',
  processing: 'Processando',
  pending: 'Pendente',
  failed: 'Falhou',
};

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-500',
  processing: 'bg-brand-blue/10 text-brand-blue',
  pending: 'bg-amber-500/10 text-amber-500',
  failed: 'bg-red-500/10 text-red-400',
};

const LEG_META: Record<Leg['recipient_type'], { label: string; icon: typeof Store; color: string }> = {
  seller: { label: 'Vendedor', icon: Store, color: 'text-brand-orange' },
  platform: { label: 'Plataforma', icon: Building2, color: 'text-brand-purple' },
  charity: { label: 'Instituição', icon: Heart, color: 'text-emerald-500' },
  reseller: { label: 'Revendedor', icon: Users2, color: 'text-brand-blue' },
};

const FILTERS = ['all', 'pending', 'processing', 'completed', 'failed'] as const;

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminSplitsPage() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    volume: 0, platform: 0, seller: 0, charity: 0, reseller: 0, gateway: 0,
    counts: {}, missingLegs: 0, missingAmount: 0, inconsistent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ splits: Split[]; metrics: Metrics }>(
        `/api/admin/splits?status=${filter}`
      );
      setSplits(data.splits);
      setMetrics(data.metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar splits');
      setSplits([]);
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
      {/* Distribuição do volume */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          ['Volume com split', metrics.volume, 'text-white'],
          ['Vendedores', metrics.seller, 'text-brand-orange'],
          ['Plataforma', metrics.platform, 'text-brand-purple'],
          ['Instituições', metrics.charity, 'text-emerald-500'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`font-display font-bold text-2xl ${color}`}>{brl(value)}</p>
            {metrics.volume > 0 && label !== 'Volume com split' && (
              <p className="text-[11px] text-gray-600 mt-0.5">
                {((value / metrics.volume) * 100).toFixed(1)}% do volume
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Split cobrado mas nunca lançado no provedor */}
      {metrics.missingLegs > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-semibold">
              {metrics.missingLegs} pedido(s) pago(s) sem lançamento de split — {brl(metrics.missingAmount)}.
            </p>
            <p className="text-amber-200/80 mt-0.5">
              O valor foi cobrado do comprador, mas nenhuma linha foi gravada em{' '}
              <code>payment_splits</code>. Os valores exibidos abaixo são o split
              <strong> planejado</strong>, calculado a partir do próprio pedido.
            </p>
          </div>
        </div>
      )}

      {metrics.inconsistent > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            {metrics.inconsistent} pedido(s) com divergência: a soma das partes não fecha com o valor bruto.
          </p>
        </div>
      )}

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
            {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
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
            <GitBranch className="w-5 h-5 text-brand-purple" /> Splits de Pagamento
            <span className="text-xs font-normal text-gray-500">({splits.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : splits.length === 0 ? (
          <div className="text-center py-16 px-5">
            <GitBranch className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Nenhum split {filter !== 'all' ? 'com esse status' : 'a exibir'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Somente pedidos pagos entram no fluxo de repasse.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {splits.map((s) => {
              const isOpen = expanded === s.id;
              return (
                <Fragment key={s.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-700/30 transition-colors text-left"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                      <div className="min-w-0">
                        <span className="block text-sm text-white font-medium truncate">
                          {s.product_title}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">
                          {s.buyer_name} → {s.seller_name} · {formatDate(s.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm text-white font-display font-semibold">
                        {brl(s.gross_value)}
                      </span>
                      {s.legs_executed === 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <CircleDashed className="w-3 h-3" /> planejado
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[s.split_status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                        {STATUS_LABEL[s.split_status] ?? s.split_status}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 py-4 bg-gray-900/40">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Distribuição do valor
                        </p>
                        <p className="text-xs text-gray-600">
                          {s.legs_executed} de {s.legs_planned} parte(s) lançada(s)
                        </p>
                      </div>

                      <div className="space-y-2">
                        {s.legs.map((leg) => {
                          const meta = LEG_META[leg.recipient_type];
                          const Icon = meta.icon;
                          return (
                            <div
                              key={leg.recipient_type}
                              className="flex items-center justify-between gap-3 py-2 border-b border-gray-700/40 last:border-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className={`w-4 h-4 flex-shrink-0 ${meta.color}`} />
                                <span className="text-sm text-gray-300">{meta.label}</span>
                                {leg.planned && (
                                  <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                    não lançado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                {s.gross_value > 0 && (
                                  <span className="text-xs text-gray-600">
                                    {((leg.amount / s.gross_value) * 100).toFixed(1)}%
                                  </span>
                                )}
                                <span className={`text-sm font-display font-semibold w-28 text-right ${meta.color}`}>
                                  {brl(leg.amount)}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        <div className="flex items-center justify-between gap-3 py-2 border-t border-gray-700">
                          <span className="text-sm text-gray-500">Taxa do gateway</span>
                          <span className="text-sm text-gray-500 font-display w-28 text-right">
                            {brl(s.gateway_fee)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-300 font-medium">Total</span>
                          <span className="text-sm text-white font-display font-bold w-28 text-right">
                            {brl(s.planned_total + s.gateway_fee)}
                          </span>
                        </div>
                      </div>

                      {Math.abs(s.residual) > 0.01 && (
                        <p className="mt-3 text-xs text-red-400">
                          Divergência de {brl(Math.abs(s.residual))} entre o valor bruto e a soma das partes.
                        </p>
                      )}

                      <p className="mt-3 text-xs text-gray-600">Pedido {s.id}</p>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
