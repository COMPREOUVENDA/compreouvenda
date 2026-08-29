'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flag, CheckCircle, XCircle, Eye, Loader2, RefreshCw, AlertTriangle,
  Package, User, MessageSquare, ExternalLink,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Report {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reporter_email: string;
  reported_type: 'product' | 'user' | 'message';
  reported_id: string;
  target_label: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolved_at: string | null;
  created_at: string;
}

interface Counts {
  total: number;
  pending: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  reviewing: 'Analisando',
  resolved: 'Resolvido',
  dismissed: 'Descartado',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  reviewing: 'bg-brand-blue/10 text-brand-blue',
  resolved: 'bg-emerald-500/10 text-emerald-500',
  dismissed: 'bg-gray-500/10 text-gray-400',
};

const TYPE_META: Record<
  string,
  { label: string; icon: typeof Package; href: (id: string) => string | null }
> = {
  product: { label: 'Produto', icon: Package, href: (id) => `/product/${id}` },
  user: { label: 'Usuário', icon: User, href: (id) => `/admin/users?id=${id}` },
  message: { label: 'Mensagem', icon: MessageSquare, href: () => null },
};

const FILTERS = ['all', 'pending', 'reviewing', 'resolved', 'dismissed'] as const;

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, pending: 0, reviewing: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ reports: Report[]; counts: Counts }>(
        `/api/admin/reports?status=${filter}`
      );
      setReports(data.reports);
      setCounts(data.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar denúncias');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: Report['status']) => {
    setUpdating(id);
    try {
      await adminFetchJson('/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          ['Pendentes', counts.pending, 'text-amber-500'],
          ['Em análise', counts.reviewing, 'text-brand-blue'],
          ['Resolvidas', counts.resolved, 'text-emerald-500'],
          ['Descartadas', counts.dismissed, 'text-gray-400'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

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

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Lista */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" /> Denúncias
            <span className="text-xs font-normal text-gray-500">({reports.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 px-5">
            <Flag className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">
              Nenhuma denúncia {filter !== 'all' ? 'com esse status' : 'registrada'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              As denúncias enviadas pelos usuários aparecem aqui para moderação.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Denunciante</th>
                  <th className="text-left px-5 py-3 font-medium">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Alvo</th>
                  <th className="text-left px-5 py-3 font-medium">Motivo</th>
                  <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Data</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {reports.map((r) => {
                  const meta = TYPE_META[r.reported_type] ?? TYPE_META.product;
                  const TypeIcon = meta.icon;
                  const targetHref = meta.href(r.reported_id);
                  const isOpen = expanded === r.id;
                  const busy = updating === r.id;

                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3">
                          <span className="text-sm text-white">{r.reporter_name}</span>
                          {r.reporter_email && (
                            <span className="block text-xs text-gray-500">{r.reporter_email}</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                            <TypeIcon className="w-3.5 h-3.5" /> {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell max-w-[200px]">
                          {targetHref ? (
                            <Link
                              href={targetHref}
                              className="text-sm text-brand-blue hover:underline inline-flex items-center gap-1 max-w-full"
                            >
                              <span className="truncate">{r.target_label}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-400 truncate block">{r.target_label}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-300 max-w-[200px] truncate">{r.reason}</td>
                        <td className="px-5 py-3 text-xs text-gray-500 hidden sm:table-cell whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[r.status]}`}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setExpanded(isOpen ? null : r.id)}
                              className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                            {r.status !== 'reviewing' && r.status !== 'resolved' && (
                              <button
                                onClick={() => changeStatus(r.id, 'reviewing')}
                                disabled={busy}
                                className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-40"
                                title="Marcar como em análise"
                              >
                                {busy
                                  ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                  : <RefreshCw className="w-4 h-4 text-brand-blue" />}
                              </button>
                            )}
                            {r.status !== 'resolved' && (
                              <button
                                onClick={() => changeStatus(r.id, 'resolved')}
                                disabled={busy}
                                className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-40"
                                title="Resolver"
                              >
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              </button>
                            )}
                            {r.status !== 'dismissed' && (
                              <button
                                onClick={() => changeStatus(r.id, 'dismissed')}
                                disabled={busy}
                                className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-40"
                                title="Descartar"
                              >
                                <XCircle className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-900/40">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-500 text-xs uppercase tracking-wide">Descrição</p>
                              <p className="text-gray-300 whitespace-pre-wrap">
                                {r.description || 'Sem descrição adicional.'}
                              </p>
                              <p className="text-xs text-gray-600 pt-2">
                                ID {r.id} · alvo {r.reported_type}:{r.reported_id}
                                {r.resolved_at && ` · encerrada em ${formatDate(r.resolved_at)}`}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
