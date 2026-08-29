'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  HandHeart, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Send, XCircle, Heart,
} from 'lucide-react';
import Link from 'next/link';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Donation {
  id: string;
  order_id: string | null;
  product_id: string | null;
  product_title: string;
  charity_id: string | null;
  charity_name: string;
  donor_id: string | null;
  donor_name: string;
  donation_type: string | null;
  amount: number;
  status: 'pending' | 'confirmed' | 'transferred' | 'failed';
  created_at: string;
}

interface Metrics {
  total: number;
  totalAmount: number;
  transferred: number;
  confirmed: number;
  pending: number;
  committed: number;
  unreconciled: number;
  activeCharities: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  transferred: 'Repassada',
  failed: 'Falhou',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  confirmed: 'bg-brand-blue/10 text-brand-blue',
  transferred: 'bg-emerald-500/10 text-emerald-500',
  failed: 'bg-red-500/10 text-red-400',
};

const FILTERS = ['all', 'pending', 'confirmed', 'transferred', 'failed'] as const;

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0, totalAmount: 0, transferred: 0, confirmed: 0,
    pending: 0, committed: 0, unreconciled: 0, activeCharities: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ donations: Donation[]; metrics: Metrics }>(
        `/api/admin/donations?status=${filter}`
      );
      setDonations(data.donations);
      setMetrics(data.metrics);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar doações');
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: Donation['status']) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetchJson('/api/admin/donations', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500">Total repassado</p>
          <p className="font-display font-bold text-2xl text-emerald-500">{brl(metrics.transferred)}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500">Aguardando repasse</p>
          <p className="font-display font-bold text-2xl text-brand-blue">
            {brl(metrics.confirmed + metrics.pending)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500">Doações registradas</p>
          <p className="font-display font-bold text-2xl text-white">{metrics.total}</p>
        </div>
        <div className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
          <p className="text-xs text-gray-500">Instituições ativas</p>
          <p className="font-display font-bold text-2xl text-brand-purple">{metrics.activeCharities}</p>
        </div>
      </div>

      {/* Conciliação: doação cobrada no checkout x lançada em donations */}
      {metrics.unreconciled > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-semibold">
              {brl(metrics.unreconciled)} cobrados em pedidos sem lançamento de doação.
            </p>
            <p className="text-amber-200/80 mt-0.5">
              Os pedidos pagos somam {brl(metrics.committed)} em doações, mas apenas{' '}
              {brl(metrics.totalAmount)} estão registrados aqui.
            </p>
          </div>
        </div>
      )}

      {metrics.activeCharities === 0 && !loading && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Heart className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-white font-medium">Nenhuma instituição ativa.</p>
            <p className="text-gray-500 mt-0.5">
              Cadastre instituições em{' '}
              <Link href="/admin/charities" className="text-brand-blue hover:underline">
                Instituições
              </Link>{' '}
              para que os vendedores possam destinar doações.
            </p>
          </div>
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
            {f === 'all' ? 'Todas' : STATUS_LABEL[f]}
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
            <HandHeart className="w-5 h-5 text-emerald-500" /> Doações
            <span className="text-xs font-normal text-gray-500">({donations.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : donations.length === 0 ? (
          <div className="text-center py-16 px-5">
            <HandHeart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma doação registrada</p>
            <p className="text-gray-600 text-sm mt-1">
              As doações aparecem quando um anúncio no modo solidário é vendido.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Instituição</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Produto</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Doador</th>
                  <th className="text-left px-5 py-3 font-medium">Valor</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Data</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {donations.map((d) => {
                  const busy = busyId === d.id;
                  return (
                    <tr key={d.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-white">{d.charity_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell max-w-[180px] truncate">
                        {d.product_title}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400 hidden sm:table-cell">{d.donor_name}</td>
                      <td className="px-5 py-3 text-sm text-emerald-500 font-medium whitespace-nowrap">
                        {brl(d.amount)}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                        {formatDate(d.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[d.status]}`}>
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 justify-end">
                          {busy ? (
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          ) : (
                            <>
                              {d.status === 'pending' && (
                                <button
                                  onClick={() => changeStatus(d.id, 'confirmed')}
                                  className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                                  title="Confirmar doação"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                                </button>
                              )}
                              {d.status !== 'transferred' && d.status !== 'failed' && (
                                <button
                                  onClick={() => changeStatus(d.id, 'transferred')}
                                  className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                                  title="Marcar como repassada"
                                >
                                  <Send className="w-4 h-4 text-emerald-400" />
                                </button>
                              )}
                              {d.status !== 'failed' && d.status !== 'transferred' && (
                                <button
                                  onClick={() => changeStatus(d.id, 'failed')}
                                  className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                                  title="Marcar como falha"
                                >
                                  <XCircle className="w-4 h-4 text-red-400" />
                                </button>
                              )}
                            </>
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
    </div>
  );
}
