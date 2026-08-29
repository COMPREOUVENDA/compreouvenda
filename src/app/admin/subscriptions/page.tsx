'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Crown, Loader2, RefreshCw, AlertTriangle, TrendingUp, Users, CheckCircle2, XCircle,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Subscription {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  plan_id: string;
  plan_name: string;
  plan_price: number;
  status: string;
  started_at: string | null;
  next_billing_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_listings: number | null;
  boost_credits: number | null;
  ai_credits: number | null;
  highlight: boolean;
  active: boolean;
  features: string[];
  subscribers: number;
  mrr: number;
}

interface Metrics {
  total: number;
  active: number;
  cancelled: number;
  mrr: number;
  arr: number;
  arpu: number;
  totalUsers: number;
  conversionRate: number;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  cancelled: 'Cancelada',
  past_due: 'Em atraso',
  paused: 'Pausada',
};

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-gray-500/10 text-gray-400',
  past_due: 'bg-red-500/10 text-red-400',
  paused: 'bg-amber-500/10 text-amber-500',
};

const BADGE_COLOR: Record<string, string> = {
  free: 'text-gray-400 border-gray-700',
  basic: 'text-brand-blue border-brand-blue/40',
  pro: 'text-brand-purple border-brand-purple/50',
  business: 'text-brand-orange border-brand-orange/40',
};

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0, active: 0, cancelled: 0, mrr: 0, arr: 0, arpu: 0, totalUsers: 0, conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{
        subscriptions: Subscription[];
        plans: Plan[];
        metrics: Metrics;
      }>(`/api/admin/subscriptions?status=${filter}`);
      setSubscriptions(data.subscriptions);
      setPlans(data.plans);
      setMetrics(data.metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar assinaturas');
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="space-y-5">
      {/* Métricas de receita recorrente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> MRR
          </p>
          <p className="font-display font-bold text-2xl text-emerald-500">{brl(metrics.mrr)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">ARR {brl(metrics.arr)}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Assinaturas ativas
          </p>
          <p className="font-display font-bold text-2xl text-white">{metrics.active}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{metrics.cancelled} canceladas</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500">ARPU</p>
          <p className="font-display font-bold text-2xl text-brand-purple">{brl(metrics.arpu)}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">por assinante ativo</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Conversão
          </p>
          <p className="font-display font-bold text-2xl text-brand-blue">
            {metrics.conversionRate.toFixed(1)}%
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">de {metrics.totalUsers} usuários</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Planos cadastrados */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-brand-purple" /> Planos disponíveis
          </h3>
          <button
            onClick={load}
            className="p-2 rounded-xl bg-gray-900/50 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && plans.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border bg-gray-900/40 p-4 ${
                  p.highlight ? 'border-brand-purple/50' : 'border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${BADGE_COLOR[p.id] ?? 'text-gray-400 border-gray-700'}`}>
                    {p.name}
                  </span>
                  {!p.active && <XCircle className="w-4 h-4 text-gray-600" />}
                </div>
                <p className="font-display font-bold text-xl text-white">
                  {p.price_monthly > 0 ? brl(p.price_monthly) : 'Grátis'}
                  {p.price_monthly > 0 && <span className="text-xs font-normal text-gray-500">/mês</span>}
                </p>
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <p>Anúncios: {p.max_listings === -1 ? 'ilimitados' : p.max_listings}</p>
                  <p>Destaques: {p.boost_credits}</p>
                  <p>Créditos IA: {p.ai_credits === -1 ? 'ilimitados' : p.ai_credits}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700/60 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{p.subscribers} assinantes</span>
                  <span className="text-xs font-semibold text-emerald-500">{brl(p.mrr)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assinaturas */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2 flex-wrap">
          <h3 className="font-display font-semibold text-white flex items-center gap-2 mr-auto">
            Assinaturas
            <span className="text-xs font-normal text-gray-500">({subscriptions.length})</span>
          </h3>
          {(['all', 'active', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-brand-purple text-white'
                  : 'bg-gray-900/50 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {f === 'all' ? 'Todas' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-16 px-5">
            <Crown className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma assinatura contratada</p>
            <p className="text-gray-600 text-sm mt-1">
              Os planos acima já estão publicados em /premium. As contratações aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Assinante</th>
                  <th className="text-left px-5 py-3 font-medium">Plano</th>
                  <th className="text-left px-5 py-3 font-medium">Valor</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Início</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Próx. cobrança</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-sm text-white">{s.user_name}</span>
                      {s.user_email && <span className="block text-xs text-gray-500">{s.user_email}</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">{s.plan_name}</td>
                    <td className="px-5 py-3 text-sm text-emerald-500 font-medium">{brl(s.plan_price)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 hidden sm:table-cell">{formatDate(s.started_at)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 hidden md:table-cell">{formatDate(s.next_billing_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[s.status] ?? 'bg-gray-500/10 text-gray-400'}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
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
