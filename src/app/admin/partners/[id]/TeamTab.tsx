'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus, Loader2, AlertTriangle, Trash2, ShieldCheck, X, Info,
} from 'lucide-react';
import { adminFetchJson, adminFetch } from '@/lib/admin-fetch';

/**
 * Gestão de acesso ao Portal do Parceiro.
 *
 * O acesso é concedido a contas que já existem no marketplace — não há
 * convite por e-mail nem criação de usuário aqui. Isso mantém uma única
 * identidade por pessoa em todo o ecossistema.
 */

interface Member {
  id: string;
  role: 'owner' | 'manager' | 'operator';
  role_label: string;
  unit_id: string | null;
  unit_name: string | null;
  is_active: boolean;
  created_at: string;
  user: { id: string; name: string | null; email: string } | null;
  is_owner_of_record: boolean;
}

interface Unit { id: string; name: string }

interface Data {
  members: Member[];
  units: Unit[];
  partner: { trade_name: string; status: string };
  warnings: string[];
}

const ROLES = [
  { v: 'owner', l: 'Responsável', d: 'Cadastro da empresa, documentos, equipe e plano' },
  { v: 'manager', l: 'Gerente', d: 'Benefícios, campanhas, unidades e relatórios' },
  { v: 'operator', l: 'Operador', d: 'Apenas validação de benefícios no balcão' },
] as const;

export default function TeamTab({ partnerId }: { partnerId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'manager', unit_id: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminFetchJson<Data>(`/api/admin/partners/${partnerId}/members`));
    } catch (e) {
      setNotice({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao carregar equipe' });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  async function grant() {
    setSaving(true);
    setFormError('');
    try {
      const res = await adminFetch(`/api/admin/partners/${partnerId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          unit_id: form.unit_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || 'Não foi possível conceder o acesso'); return; }
      setNotice({ type: 'ok', text: json.message });
      setModal(false);
      setForm({ email: '', role: 'manager', unit_id: '' });
      load();
    } catch {
      setFormError('Falha de conexão');
    } finally {
      setSaving(false);
    }
  }

  async function update(memberId: string, patch: Record<string, unknown>) {
    setBusy(memberId);
    try {
      const res = await adminFetch(`/api/admin/partners/${partnerId}/members`, {
        method: 'PATCH',
        body: JSON.stringify({ member_id: memberId, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) setNotice({ type: 'err', text: json.error });
      else setNotice(null);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function revoke(m: Member) {
    const who = m.user?.name || m.user?.email || 'este membro';
    if (!confirm(`Revogar o acesso de ${who} ao Portal do Parceiro?`)) return;

    setBusy(m.id);
    try {
      const res = await adminFetch(
        `/api/admin/partners/${partnerId}/members?member_id=${m.id}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      setNotice({ type: res.ok ? 'ok' : 'err', text: json.message || json.error });
      load();
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 text-brand-purple animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          O acesso ao <strong className="text-gray-300">Portal do Parceiro</strong> é concedido a
          contas já cadastradas no COMPREOUVENDA. A pessoa entra com o mesmo login do
          marketplace — não existe senha separada para o portal.
        </p>
      </div>

      {data?.warnings.map((w, i) => (
        <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">{w}</p>
        </div>
      ))}

      {notice && (
        <div className={`rounded-2xl px-5 py-3 flex items-start justify-between gap-3 border ${
          notice.type === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <p className="text-sm">{notice.text}</p>
          <button onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { setFormError(''); setModal(true); }}
          className="flex items-center gap-1.5 text-xs bg-brand-purple text-white px-3 py-2 rounded-xl hover:opacity-90"
        >
          <UserPlus className="w-3.5 h-3.5" /> Conceder acesso
        </button>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
        {!data?.members.length ? (
          <p className="text-sm text-gray-500 text-center py-14">
            Nenhuma conta tem acesso ao Portal do Parceiro desta empresa.
          </p>
        ) : data.members.map((m) => (
          <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-white font-medium">{m.user?.name ?? 'Usuário removido'}</p>
                {m.is_owner_of_record && (
                  <span className="text-[10px] bg-brand-purple/20 text-brand-purple font-bold px-2 py-0.5 rounded-full">
                    responsável de registro
                  </span>
                )}
                {!m.is_active && (
                  <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-full">
                    acesso inativo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {m.user?.email} · {m.unit_name ?? 'todas as unidades'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={m.role}
                disabled={busy === m.id}
                onChange={(e) => update(m.id, { role: e.target.value })}
                className="bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none disabled:opacity-50"
              >
                {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>

              {data.units.length > 0 && (
                <select
                  value={m.unit_id ?? ''}
                  disabled={busy === m.id}
                  onChange={(e) => update(m.id, { unit_id: e.target.value || null })}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none disabled:opacity-50"
                >
                  <option value="">Todas as unidades</option>
                  {data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}

              <button
                onClick={() => update(m.id, { is_active: !m.is_active })}
                disabled={busy === m.id}
                className="text-xs text-gray-400 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-xl disabled:opacity-50"
              >
                {m.is_active ? 'Desativar' : 'Reativar'}
              </button>

              <button
                onClick={() => revoke(m)}
                disabled={busy === m.id}
                className="text-red-400 hover:text-red-300 p-1.5 disabled:opacity-50"
                title="Revogar acesso"
              >
                {busy === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-purple" /> Conceder acesso ao portal
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">E-mail da conta</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="pessoa@empresa.com.br"
                  type="email"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-purple"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  A conta precisa existir no COMPREOUVENDA. Se a pessoa ainda não se
                  cadastrou, peça que ela crie a conta antes.
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Papel na empresa</label>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <label
                      key={r.v}
                      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                        form.role === r.v
                          ? 'bg-brand-purple/10 border-brand-purple/40'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.v}
                        checked={form.role === r.v}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="mt-0.5 accent-purple-500"
                      />
                      <span className="min-w-0">
                        <span className="text-sm text-white block">{r.l}</span>
                        <span className="text-[11px] text-gray-500">{r.d}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {data && data.units.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">
                    Unidade <span className="text-gray-600">(opcional)</span>
                  </label>
                  <select
                    value={form.unit_id}
                    onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="">Todas as unidades</option>
                    {data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-600 mt-1">
                    Restringir a uma unidade faz o operador enxergar apenas o movimento dela.
                  </p>
                </div>
              )}

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{formError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
              <button onClick={() => setModal(false)}
                className="text-xs text-gray-300 bg-gray-700 px-4 py-2 rounded-xl">
                Cancelar
              </button>
              <button
                onClick={grant}
                disabled={saving || !form.email.trim()}
                className="text-xs text-white bg-brand-purple px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Conceder acesso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
