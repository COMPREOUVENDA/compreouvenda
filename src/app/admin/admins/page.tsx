'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Shield, Plus, Trash2, Check, X, Loader2, RefreshCw, AlertTriangle,
  ToggleLeft, ToggleRight, UserCog,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-500/10 text-red-400' },
  { value: 'admin_operational', label: 'Operacional', color: 'bg-brand-purple/10 text-brand-purple' },
  { value: 'admin_financial', label: 'Financeiro', color: 'bg-emerald-500/10 text-emerald-500' },
  { value: 'admin_support', label: 'Suporte', color: 'bg-brand-blue/10 text-brand-blue' },
  { value: 'admin_moderation', label: 'Moderação', color: 'bg-amber-500/10 text-amber-500' },
  { value: 'admin_content', label: 'Conteúdo', color: 'bg-brand-orange/10 text-brand-orange' },
];

const roleMeta = (v: string) => ROLES.find((r) => r.value === v);

interface Admin {
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  can_sign_in: boolean;
  is_self: boolean;
  created_at: string;
}

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin_operational');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ admins: Admin[]; currentRole: string }>('/api/admin/admins');
      setAdmins(data.admins);
      setCurrentRole(data.currentRole);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar administradores');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const isSuper = currentRole === 'super_admin';

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetchJson('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      });
      showMsg('Administrador adicionado com sucesso.');
      setShowForm(false);
      setEmail('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível adicionar');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetchJson('/api/admin/admins', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...body }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (a: Admin) => {
    if (!confirm(`Revogar o acesso administrativo de ${a.email}?`)) return;
    setBusyId(a.id);
    setError(null);
    try {
      await adminFetchJson(`/api/admin/admins?id=${a.id}`, { method: 'DELETE' });
      showMsg('Acesso revogado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível revogar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-400">
          {admins.length} administrador(es) · fonte única <code className="text-gray-500">admin_users</code>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isSuper && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-brand-purple text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-purple/90"
            >
              <Plus className="w-4 h-4" /> Adicionar Admin
            </button>
          )}
        </div>
      </div>

      {!isSuper && !loading && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-400">
            Somente um <strong className="text-gray-300">Super Admin</strong> pode conceder ou revogar acessos.
            Você está em modo de leitura.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {showForm && isSuper && (
        <div className="bg-gray-800 rounded-2xl border border-brand-purple/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Promover usuário a administrador</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">E-mail do usuário</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              O usuário precisa já ter uma conta no aplicativo — o acesso é vinculado ao login existente.
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nível de acesso</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !email.trim()}
              className="flex-1 bg-brand-purple text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-purple/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Confirmar</>}
            </button>
          </div>
        </div>
      )}

      {/* Lista de administradores */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-brand-purple" /> Administradores
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 px-5">
            <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum administrador cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {admins.map((a) => {
              const meta = roleMeta(a.role);
              const busy = busyId === a.id;
              const bloqueado = !isSuper || a.is_self;

              return (
                <div key={a.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-700/30 transition-colors">
                  <div className="min-w-0">
                    <span className="text-sm text-white font-medium flex items-center gap-2">
                      <span className="truncate">{a.name}</span>
                      {a.is_self && (
                        <span className="text-[10px] bg-gray-600/40 text-gray-400 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          você
                        </span>
                      )}
                      {!a.is_active && (
                        <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          inativo
                        </span>
                      )}
                      {!a.can_sign_in && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          sem login
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">{a.email}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {busy ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : bloqueado ? (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${meta?.color ?? 'bg-gray-600/10 text-gray-400'}`}>
                        {meta?.label ?? a.role}
                      </span>
                    ) : (
                      <>
                        <select
                          value={a.role}
                          onChange={(e) => patch(a.id, { role: e.target.value })}
                          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-purple"
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button
                          onClick={() => patch(a.id, { is_active: !a.is_active })}
                          title={a.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {a.is_active
                            ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                            : <ToggleLeft className="w-6 h-6 text-gray-600" />}
                        </button>
                        <button
                          onClick={() => revoke(a)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Revogar acesso"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Referência dos níveis */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-purple" /> Níveis de Acesso
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-center gap-3 bg-gray-700/30 rounded-xl px-4 py-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
              <span className="text-xs text-gray-500 font-mono">{r.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Um <strong className="text-gray-400">Super Admin</strong> tem acesso a todas as áreas.
          Os demais níveis liberam apenas as rotas correspondentes ao seu escopo.
        </p>
      </div>
    </div>
  );
}
