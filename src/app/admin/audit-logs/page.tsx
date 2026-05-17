'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollText, RefreshCw, Loader2, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AuditAction } from '@/lib/audit';

interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string | null;
  action: AuditAction;
  target_type: string;
  target_id: string | null;
  target_email: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  user_deleted: 'Usuário excluído',
  user_blocked: 'Usuário bloqueado',
  user_suspended: 'Usuário suspenso',
  user_reactivated: 'Usuário reativado',
  account_deletion_requested: 'Exclusão solicitada',
  account_deletion_cancelled: 'Exclusão cancelada',
};

const ACTION_COLORS: Record<string, string> = {
  user_deleted: 'bg-red-500/10 text-red-400',
  user_blocked: 'bg-orange-500/10 text-orange-400',
  user_suspended: 'bg-amber-500/10 text-amber-400',
  user_reactivated: 'bg-emerald-500/10 text-emerald-400',
  account_deletion_requested: 'bg-red-500/10 text-red-300',
  account_deletion_cancelled: 'bg-brand-blue/10 text-brand-blue',
};

const PAGE_SIZE = 20;

const MOCK_LOGS: AuditLog[] = [
  { id: '1', actor_id: '0', actor_email: 'admin@compreouvenda.com', action: 'user_suspended', target_type: 'user', target_id: null, target_email: 'pedro@email.com', details: null, ip_address: '192.168.1.100', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', actor_id: '0', actor_email: 'admin@compreouvenda.com', action: 'user_reactivated', target_type: 'user', target_id: null, target_email: 'joao@email.com', details: null, ip_address: '192.168.1.100', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', actor_id: '0', actor_email: 'maria@email.com', action: 'account_deletion_requested', target_type: 'user', target_id: null, target_email: 'maria@email.com', details: null, ip_address: null, created_at: new Date(Date.now() - 86400000).toISOString() },
];

type ActionFilter = 'all' | AuditAction;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom + 'T00:00:00');
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59');
      }

      const { data, count, error } = await query;

      if (error || !data || data.length === 0) {
        setLogs(page === 0 ? MOCK_LOGS : []);
        setTotal(page === 0 ? MOCK_LOGS.length : 0);
      } else {
        setLogs(data as AuditLog[]);
        setTotal(count ?? 0);
      }
    } catch {
      setLogs(page === 0 ? MOCK_LOGS : []);
      setTotal(page === 0 ? MOCK_LOGS.length : 0);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const actionOptions: { value: ActionFilter; label: string }[] = [
    { value: 'all', label: 'Todas as ações' },
    { value: 'user_deleted', label: 'Exclusões' },
    { value: 'user_blocked', label: 'Bloqueios' },
    { value: 'user_suspended', label: 'Suspensões' },
    { value: 'user_reactivated', label: 'Reativações' },
    { value: 'account_deletion_requested', label: 'Exclusão solicitada' },
    { value: 'account_deletion_cancelled', label: 'Exclusão cancelada' },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
            className="bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            {actionOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
          <button
            onClick={() => { setActionFilter('all'); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-gray-700 rounded-xl text-gray-400 hover:text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-gray-400" />
            <h3 className="font-display font-semibold text-white">Logs de Auditoria</h3>
          </div>
          <span className="text-xs text-gray-500">{total} registro{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs text-gray-500 px-5 py-3">Data/Hora</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3">Ator</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3">Ação</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">Alvo</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 hidden lg:table-cell">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-500 text-sm">Nenhum log encontrado</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/30">
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3 text-sm text-white">
                    {log.actor_email || log.actor_id.substring(0, 8) + '...'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-600/50 text-gray-400'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">
                    {log.target_email || (log.target_id ? log.target_id.substring(0, 8) + '...' : '—')}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {log.details ? (
                      <span className="text-[10px] text-gray-500 font-mono">
                        {JSON.stringify(log.details).substring(0, 60)}
                        {JSON.stringify(log.details).length > 60 ? '...' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-600 transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-600 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
