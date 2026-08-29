'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  LifeBuoy, Loader2, RefreshCw, AlertTriangle, ChevronDown, UserCheck, Mail,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Ticket {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  description: string;
  category: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assigned_to: string | null;
  assigned_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Counts {
  total: number;
  open: number;
  in_progress: number;
  waiting_user: number;
  resolved: number;
  closed: number;
  urgent: number;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  waiting_user: 'Aguardando usuário',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-500',
  in_progress: 'bg-brand-blue/10 text-brand-blue',
  waiting_user: 'bg-purple-500/10 text-purple-400',
  resolved: 'bg-emerald-500/10 text-emerald-500',
  closed: 'bg-gray-500/10 text-gray-400',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};

const PRIORITY_STYLE: Record<string, string> = {
  low: 'text-gray-400', medium: 'text-brand-blue', high: 'text-brand-orange', urgent: 'text-red-500',
};

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Counts>({
    total: 0, open: 0, in_progress: 0, waiting_user: 0, resolved: 0, closed: 0, urgent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [priority, setPriority] = useState<'all' | Ticket['priority']>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ tickets: Ticket[]; counts: Counts }>(
        `/api/admin/support?status=${status}&priority=${priority}`
      );
      setTickets(data.tickets);
      setCounts(data.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [status, priority]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setUpdating(id);
    try {
      await adminFetchJson('/api/admin/support', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...body }),
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
          ['Abertos', counts.open, 'text-amber-500'],
          ['Em andamento', counts.in_progress, 'text-brand-blue'],
          ['Urgentes ativos', counts.urgent, 'text-red-500'],
          ['Resolvidos', counts.resolved, 'text-emerald-500'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              status === f
                ? 'bg-brand-purple text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {f === 'all' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple"
        >
          <option value="all">Todas as prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
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
            <LifeBuoy className="w-5 h-5 text-brand-blue" /> Tickets de Suporte
            <span className="text-xs font-normal text-gray-500">({tickets.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 px-5">
            <LifeBuoy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum ticket encontrado</p>
            <p className="text-gray-600 text-sm mt-1">
              Os chamados abertos pelos usuários aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {tickets.map((t) => {
              const isOpen = expanded === t.id;
              const busy = updating === t.id;

              return (
                <Fragment key={t.id}>
                  <div className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-700/30 transition-colors">
                    <button
                      onClick={() => setExpanded(isOpen ? null : t.id)}
                      className="flex items-start gap-3 text-left min-w-0 flex-1"
                    >
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm text-white font-medium truncate">{t.subject}</span>
                        <span className="block text-xs text-gray-500 truncate">
                          {t.user_name} · {formatDate(t.created_at)}
                          {t.category && ` · ${t.category}`}
                          {t.assigned_name && ` · resp. ${t.assigned_name}`}
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-bold ${PRIORITY_STYLE[t.priority]}`}>
                        {PRIORITY_LABEL[t.priority]}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLE[t.status]}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                      {busy && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 py-4 bg-gray-900/40 space-y-4">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Descrição</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{t.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={t.status}
                          onChange={(e) => patch(t.id, { status: e.target.value })}
                          disabled={busy}
                          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple disabled:opacity-50"
                        >
                          {Object.entries(STATUS_LABEL).map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                          ))}
                        </select>

                        <select
                          value={t.priority}
                          onChange={(e) => patch(t.id, { priority: e.target.value })}
                          disabled={busy}
                          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-purple disabled:opacity-50"
                        >
                          {Object.entries(PRIORITY_LABEL).map(([v, label]) => (
                            <option key={v} value={v}>{label}</option>
                          ))}
                        </select>

                        <button
                          onClick={() => patch(t.id, { assign: !t.assigned_to })}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {t.assigned_to ? 'Liberar atribuição' : 'Assumir ticket'}
                        </button>

                        {t.user_email && (
                          <a
                            href={`mailto:${t.user_email}?subject=${encodeURIComponent(`Re: ${t.subject}`)}`}
                            className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs rounded-xl px-3 py-2 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" /> Responder por e-mail
                          </a>
                        )}
                      </div>

                      <p className="text-xs text-gray-600">
                        ID {t.id} · {t.user_email || 'sem e-mail'} · atualizado em {formatDate(t.updated_at)}
                      </p>
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
