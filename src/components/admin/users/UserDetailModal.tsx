'use client';

import { useState, useEffect } from 'react';
import {
  X, User, FileText, History, Activity, Flag,
  CheckCircle, XCircle, FileWarning, Loader2, Clock, Shield
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserRow } from '@/hooks/useUserManagement';
import { VerificationBadge } from './VerificationBadge';
import { TrustScoreBadge } from './TrustScoreBadge';
import { DocumentViewer } from './DocumentViewer';

interface UserDetailModalProps {
  user: UserRow;
  onClose: () => void;
  onApprove: (id: string, justification: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onRequestDocuments: (id: string) => Promise<void>;
}

type TabId = 'dados' | 'documentos' | 'historico' | 'atividade' | 'denuncias';

interface VerificationHistory {
  id: string;
  old_status: string;
  new_status: string;
  reason: string;
  changed_at: string;
}

interface UserReport {
  id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dados', label: 'Dados', icon: <User className="w-3.5 h-3.5" /> },
  { id: 'documentos', label: 'Documentos', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'historico', label: 'Histórico', icon: <History className="w-3.5 h-3.5" /> },
  { id: 'atividade', label: 'Atividade', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'denuncias', label: 'Denúncias', icon: <Flag className="w-3.5 h-3.5" /> },
];

export function UserDetailModal({
  user,
  onClose,
  onApprove,
  onReject,
  onRequestDocuments,
}: UserDetailModalProps) {
  const [tab, setTab] = useState<TabId>('dados');
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [orders, setOrders] = useState<number>(0);
  const [products, setProducts] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | null>(null);
  const [actionText, setActionText] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (tab === 'historico' && history.length === 0) {
      loadHistory();
    }
    if (tab === 'denuncias' && reports.length === 0) {
      loadReports();
    }
    if (tab === 'atividade' && orders === 0 && products === 0) {
      loadActivity();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('user_verification_history')
      .select('*')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false });
    setHistory(data ?? []);
    setHistoryLoading(false);
  };

  const loadReports = async () => {
    setReportsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('user_reports')
      .select('*')
      .eq('reported_user_id', user.id)
      .order('created_at', { ascending: false });
    setReports(data ?? []);
    setReportsLoading(false);
  };

  const loadActivity = async () => {
    const supabase = createClient();
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
    const { count: productsCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');
    setOrders(ordersCount ?? 0);
    setProducts(productsCount ?? 0);
  };

  const handleAction = async () => {
    if (!actionText.trim()) {
      setActionError(actionModal === 'reject' ? 'Motivo obrigatório' : 'Justificativa obrigatória');
      return;
    }
    setActionLoading(actionModal);
    setActionError('');
    try {
      if (actionModal === 'approve') await onApprove(user.id, actionText);
      else if (actionModal === 'reject') await onReject(user.id, actionText);
      setActionModal(null);
      setActionText('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro na operação');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{user.name}</span>
                {user.is_pro && <span className="bg-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">PRO</span>}
                {user.role === 'admin' && <span className="bg-brand-purple text-white text-[8px] font-bold px-1.5 py-0.5 rounded">ADMIN</span>}
              </div>
              <span className="text-xs text-gray-500">{user.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <VerificationBadge status={user.verification_status} size="md" />
            <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded-xl">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-700 flex-shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'text-brand-purple border-b-2 border-brand-purple bg-brand-purple/5'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* DADOS */}
          {tab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Tipo" value={user.type === 'seller' ? 'Vendedor' : user.type === 'charity' ? 'Instituição' : 'Comprador'} />
                <InfoRow label="Status" value={user.status ?? 'active'} />
                <InfoRow label="Cidade" value={user.city && user.state ? `${user.city}, ${user.state}` : '—'} />
                <InfoRow label="Data de Nascimento" value={user.birth_date ? new Date(user.birth_date).toLocaleDateString('pt-BR') : '—'} />
                <InfoRow label="Telefone" value={user.phone ?? '—'} />
                <InfoRow label="Documento" value={user.document ? '•••••' + user.document.slice(-4) : '—'} />
                <InfoRow label="IP de Registro" value={user.registration_ip ?? '—'} />
                <InfoRow label="Último Acesso" value={formatDate(user.last_activity_at)} />
                <InfoRow label="Cadastrado em" value={formatDate(user.created_at)} />
                {user.verified_at && <InfoRow label="Verificado em" value={formatDate(user.verified_at)} />}
                {user.rejection_reason && <InfoRow label="Motivo da rejeição" value={user.rejection_reason} className="col-span-2" />}
              </div>

              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-400 mb-2">Trust Score</p>
                <TrustScoreBadge score={user.trust_score ?? 0} showLabel showBar />
              </div>
            </div>
          )}

          {/* DOCUMENTOS */}
          {tab === 'documentos' && (
            <DocumentViewer
              userId={user.id}
              frontUrl={user.document_front_url}
              backUrl={user.document_back_url}
              selfieUrl={user.selfie_url}
            />
          )}

          {/* HISTÓRICO */}
          {tab === 'historico' && (
            <div className="space-y-2">
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">Nenhum histórico de verificação</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex gap-3 items-start bg-gray-700/40 rounded-xl p-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      h.new_status === 'approved' ? 'bg-emerald-400' :
                      h.new_status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white capitalize">
                          {h.old_status ?? 'inicial'} → {h.new_status}
                        </span>
                        <span className="text-[10px] text-gray-500">{formatDate(h.changed_at)}</span>
                      </div>
                      {h.reason && <p className="text-xs text-gray-400 mt-0.5">{h.reason}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ATIVIDADE */}
          {tab === 'atividade' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-700/40 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{orders}</p>
                  <p className="text-xs text-gray-500 mt-1">Total de Transações</p>
                </div>
                <div className="bg-gray-700/40 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{products}</p>
                  <p className="text-xs text-gray-500 mt-1">Anúncios Ativos</p>
                </div>
              </div>
              <InfoRow label="Último acesso" value={formatDate(user.last_activity_at)} />
              <InfoRow label="Membro desde" value={formatDate(user.created_at)} />
            </div>
          )}

          {/* DENÚNCIAS */}
          {tab === 'denuncias' && (
            <div className="space-y-2">
              {reportsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-gray-500">
                  <Shield className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Nenhuma denúncia recebida</p>
                </div>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="bg-gray-700/40 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-red-400">{r.reason}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                        r.status === 'dismissed' ? 'bg-gray-600/50 text-gray-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {r.status === 'pending' ? 'Pendente' :
                         r.status === 'reviewing' ? 'Em análise' :
                         r.status === 'resolved' ? 'Resolvido' : 'Descartado'}
                      </span>
                    </div>
                    {r.description && <p className="text-xs text-gray-400">{r.description}</p>}
                    <p className="text-[10px] text-gray-500">{formatDate(r.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 p-4 border-t border-gray-700 flex-shrink-0 flex-wrap">
          <button
            onClick={() => { setActionModal('approve'); setActionText(''); setActionError(''); }}
            disabled={user.verification_status === 'approved'}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Aprovar
          </button>
          <button
            onClick={() => { setActionModal('reject'); setActionText(''); setActionError(''); }}
            disabled={user.verification_status === 'rejected'}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reprovar
          </button>
          <button
            onClick={() => onRequestDocuments(user.id)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-xl transition-colors"
          >
            <FileWarning className="w-3.5 h-3.5" />
            Solicitar Docs
          </button>
        </div>
      </div>

      {/* Inline Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h2 className="font-bold text-white text-sm">
                {actionModal === 'approve' ? 'Aprovar usuário' : 'Reprovar usuário'}
              </h2>
              <button onClick={() => setActionModal(null)} className="p-1 hover:bg-gray-700 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="text-xs text-gray-400 font-semibold block">
                {actionModal === 'approve' ? 'Justificativa' : 'Motivo'}{' '}
                <span className="text-red-400">*</span>
              </label>
              <textarea
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                rows={3}
                placeholder={actionModal === 'approve' ? 'Justificativa para aprovação...' : 'Motivo da reprovação...'}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 resize-none"
              />
              {actionError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{actionError}</p>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={!actionText.trim() || !!actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                  actionModal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  actionModal === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-gray-700/30 rounded-xl px-3 py-2 ${className}`}>
      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-sm text-white mt-0.5 break-all">{value}</p>
    </div>
  );
}
