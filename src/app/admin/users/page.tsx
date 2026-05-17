'use client';

import { useState } from 'react';
import {
  Search, RefreshCw, Loader2, Shield, Ban, CheckCircle,
  Trash2, X, AlertTriangle, Eye, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useUserManagement, DEFAULT_FILTERS, type UserRow } from '@/hooks/useUserManagement';
import { UserStatsCards } from '@/components/admin/users/UserStatsCards';
import { UserFiltersPanel } from '@/components/admin/users/UserFilters';
import { BulkActions } from '@/components/admin/users/BulkActions';
import { VerificationBadge } from '@/components/admin/users/VerificationBadge';
import { TrustScoreBadge } from '@/components/admin/users/TrustScoreBadge';
import { UserDetailModal } from '@/components/admin/users/UserDetailModal';

// -----------------------------------------------
// Delete Modal (preserved from original)
// -----------------------------------------------
interface AdminDeleteModalProps {
  user: UserRow;
  onClose: () => void;
  onConfirm: (opts: { deleteType: 'soft' | 'hard'; reason: string; notify: boolean }) => Promise<void>;
}

function AdminDeleteModal({ user, onClose, onConfirm }: AdminDeleteModalProps) {
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) { setError('O motivo é obrigatório.'); return; }
    setLoading(true);
    setError('');
    try {
      await onConfirm({ deleteType, reason, notify });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="font-bold text-white">Excluir Conta de {user.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 block">Tipo de exclusão</label>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-600 cursor-pointer hover:border-amber-500 transition-colors">
              <input type="radio" name="deleteType" value="soft" checked={deleteType === 'soft'} onChange={() => setDeleteType('soft')} className="mt-0.5 accent-amber-500" />
              <div>
                <span className="text-sm font-medium text-white block">Soft Delete (padrão)</span>
                <span className="text-xs text-gray-400">Marcar para exclusão em 30 dias</span>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-600 cursor-pointer hover:border-red-500 transition-colors">
              <input type="radio" name="deleteType" value="hard" checked={deleteType === 'hard'} onChange={() => setDeleteType('hard')} className="mt-0.5 accent-red-500" />
              <div>
                <span className="text-sm font-medium text-red-400 block">Hard Delete</span>
                <span className="text-xs text-gray-400">Remover imediatamente e permanentemente</span>
              </div>
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Motivo da exclusão <span className="text-red-400">*</span></label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo..."
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-brand-purple" />
            <span className="text-xs text-gray-300">Notificar usuário por email</span>
          </label>
          {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------
// Main Page
// -----------------------------------------------
export default function AdminUsersPage() {
  const {
    users, loading, filters, selectedIds, stats, pagination,
    applyFilters, fetchUsers, approveUser, rejectUser, requestDocuments,
    blockUser, suspendUser, toggleRole, deleteUser,
    bulkApprove, bulkReject, exportCSV,
    toggleSelect, toggleSelectAll, setPage,
  } = useUserManagement();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const handleApprove = async (id: string, justification: string) => {
    setActionId(id);
    try {
      await approveUser(id, justification);
      showToast('Usuário aprovado com sucesso');
    } catch {
      showToast('Erro ao aprovar usuário', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionId(id);
    try {
      await rejectUser(id, reason);
      showToast('Usuário reprovado');
    } catch {
      showToast('Erro ao reprovar usuário', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (opts: { deleteType: 'soft' | 'hard'; reason: string; notify: boolean }) => {
    if (!deleteTarget) return;
    try {
      await deleteUser({ user: deleteTarget, ...opts });
      showToast(`Usuário ${opts.deleteType === 'soft' ? 'agendado para exclusão' : 'excluído'}`);
      setDeleteTarget(null);
    } catch {
      showToast('Erro ao excluir usuário', 'error');
    }
  };

  const handleSuspend = async (user: UserRow) => {
    setActionId(user.id);
    try {
      await suspendUser(user);
      showToast(user.status === 'suspended' ? 'Usuário reativado' : 'Usuário suspenso');
    } catch {
      showToast('Erro ao alterar status', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleBlock = async (user: UserRow) => {
    setActionId(user.id);
    try {
      await blockUser(user);
      showToast('Usuário bloqueado');
    } catch {
      showToast('Erro ao bloquear', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleRole = async (user: UserRow) => {
    setActionId(user.id);
    try {
      await toggleRole(user);
      showToast(`Papel alterado para ${user.role === 'admin' ? 'user' : 'admin'}`);
    } catch {
      showToast('Erro ao alterar papel', 'error');
    } finally {
      setActionId(null);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.perPage);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'verified': return 'bg-blue-500/10 text-blue-400';
      case 'suspended': return 'bg-red-500/10 text-red-500';
      case 'blocked': return 'bg-gray-600/50 text-gray-300';
      case 'pending_deletion': return 'bg-amber-500/10 text-amber-400';
      default: return 'bg-gray-600/50 text-gray-400';
    }
  };

  const getStatusLabel = (status?: string) => {
    const map: Record<string, string> = {
      active: 'Ativo', verified: 'Verificado', suspended: 'Suspenso',
      blocked: 'Bloqueado', pending_deletion: 'Ag. Exclusão',
    };
    return map[status ?? ''] ?? 'Ativo';
  };

  // Alerts banner: users with trust score < 20
  const alertUsers = users.filter((u) => (u.trust_score ?? 0) < 20 && u.status !== 'blocked');

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Stats Cards */}
      <UserStatsCards stats={stats} loading={loading} />

      {/* Alerts */}
      {alertUsers.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-400">
              {alertUsers.length} conta{alertUsers.length > 1 ? 's' : ''} suspeita{alertUsers.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Contas com trust score crítico (abaixo de 20). Revise e tome ação.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </form>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
              showFilters ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            Filtros
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-700 text-gray-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="p-2.5 bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.length}
          onApprove={async (j) => { await bulkApprove(selectedIds, j); showToast('Aprovação em lote concluída'); }}
          onReject={async (r) => { await bulkReject(selectedIds, r); showToast('Reprovação em lote concluída'); }}
          onExport={exportCSV}
          onClearSelection={() => toggleSelectAll()}
        />
      )}

      {/* Filters panel */}
      {showFilters && (
        <UserFiltersPanel
          filters={filters}
          onChange={(f) => applyFilters(f)}
          onReset={() => applyFilters(DEFAULT_FILTERS)}
        />
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="accent-brand-purple"
                  />
                </th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Usuário</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tipo</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Verificação</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Trust Score</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden lg:table-cell">Status</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden xl:table-cell">Cidade</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 hidden xl:table-cell">Cadastro</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500 text-sm">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-700/30 transition-colors ${
                      selectedIds.includes(user.id) ? 'bg-brand-purple/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="accent-brand-purple"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-white font-medium">{user.name}</span>
                            {user.is_pro && <span className="bg-yellow-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">PRO</span>}
                            {user.role === 'admin' && <span className="bg-brand-purple text-white text-[8px] font-bold px-1 py-0.5 rounded">ADMIN</span>}
                          </div>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.type === 'seller' ? 'bg-orange-500/10 text-orange-400' :
                        user.type === 'charity' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {user.type === 'seller' ? 'Vendedor' : user.type === 'charity' ? 'Instituição' : 'Comprador'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadge status={user.verification_status} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <TrustScoreBadge score={user.trust_score ?? 0} showLabel={false} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(user.status)}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">
                      {user.city && user.state ? `${user.city}, ${user.state}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden xl:table-cell">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDetailUser(user)}
                          title="Ver detalhes"
                          className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggleRole(user)}
                          disabled={actionId === user.id}
                          title={user.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                          className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Shield className={`w-4 h-4 ${user.role === 'admin' ? 'text-brand-purple' : 'text-gray-400'}`} />
                        </button>
                        <button
                          onClick={() => handleSuspend(user)}
                          disabled={actionId === user.id}
                          title={user.status === 'suspended' ? 'Reativar' : 'Suspender'}
                          className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {user.status === 'suspended'
                            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                            : <Ban className="w-4 h-4 text-red-400" />
                          }
                        </button>
                        {user.status !== 'blocked' && (
                          <button
                            onClick={() => handleBlock(user)}
                            disabled={actionId === user.id}
                            title="Bloquear permanentemente"
                            className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-4 h-4 text-amber-400" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={actionId === user.id}
                          title="Excluir conta"
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-gray-500">
            {pagination.total} usuário{pagination.total !== 1 ? 's' : ''} no total
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 bg-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-400">
                Página {pagination.page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, pagination.page + 1))}
                disabled={pagination.page >= totalPages}
                className="p-1.5 bg-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {detailUser && (
        <UserDetailModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestDocuments={async (id) => {
            await requestDocuments(id);
            showToast('Solicitação de documentos enviada');
          }}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <AdminDeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
