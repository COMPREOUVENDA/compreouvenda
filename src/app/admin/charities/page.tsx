'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Heart, Plus, Loader2, RefreshCw, AlertTriangle, CheckCircle2, X, Trash2,
  ToggleLeft, ToggleRight, BadgeCheck, Search,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Charity {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  pix_key: string | null;
  category: string | null;
  verified: boolean;
  active: boolean;
  total_received: number;
  supporters: number;
  real_received: number;
  pending_amount: number;
  donations_count: number;
  donors_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'education', label: 'Educação' },
  { value: 'environment', label: 'Meio ambiente' },
  { value: 'health', label: 'Saúde' },
  { value: 'animals', label: 'Animais' },
  { value: 'children', label: 'Infância' },
  { value: 'elderly', label: 'Idosos' },
  { value: 'food', label: 'Combate à fome' },
  { value: 'culture', label: 'Cultura' },
];

const BLANK = {
  name: '', document: '', email: '', phone: '',
  description: '', pix_key: '', category: 'education', verified: false,
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AdminCharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ charities: Charity[] }>('/api/admin/charities');
      setCharities(data.charities);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar instituições');
      setCharities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await adminFetchJson('/api/admin/charities', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ ...BLANK });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível cadastrar');
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await adminFetchJson('/api/admin/charities', {
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

  const remove = async (c: Charity) => {
    if (!confirm(`Excluir "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(c.id);
    setError(null);
    try {
      await adminFetchJson(`/api/admin/charities?id=${c.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = search.trim()
    ? charities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    : charities;

  const totalReceived = charities.reduce((s, c) => s + c.real_received, 0);

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          ['Instituições', charities.length, 'text-white'],
          ['Verificadas', charities.filter((c) => c.verified).length, 'text-brand-blue'],
          ['Ativas', charities.filter((c) => c.active).length, 'text-emerald-500'],
          ['Total repassado', brl(totalReceived), 'text-emerald-400'],
        ] as const).map(([label, value, color]) => (
          <div key={label} className="bg-gray-800 rounded-2xl border border-gray-700 px-5 py-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {charities.length === 0 && !loading && !error && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <p className="font-semibold">O módulo solidário está sem instituições.</p>
            <p className="text-amber-200/80 mt-0.5">
              A página pública /solidario e a seleção de instituição no anúncio ficam vazias
              enquanto nenhuma instituição estiver cadastrada e ativa.
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

      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple"
          />
        </div>
        <button
          onClick={load}
          className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-brand-purple hover:bg-brand-purple/90 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova instituição
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-800 rounded-2xl border-2 border-brand-purple/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white">Cadastrar instituição</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-700 rounded-xl">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Nome *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Associação Beneficente..."
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">CNPJ</label>
              <input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Causa</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-purple"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">E-mail</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@instituicao.org"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(83) 90000-0000"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Chave PIX (destino do repasse)</label>
              <input
                value={form.pix_key}
                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                placeholder="CNPJ, e-mail ou chave aleatória"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1.5">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="O que a instituição faz e quem ela atende."
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 placeholder:text-gray-600 focus:outline-none focus:border-brand-purple resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.verified}
                onChange={(e) => setForm({ ...form, verified: e.target.checked })}
                className="w-4 h-4 rounded accent-brand-purple"
              />
              Marcar como verificada
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-purple text-white text-sm font-semibold hover:bg-brand-purple/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Cadastrar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-500" /> Instituições Beneficentes
            <span className="text-xs font-normal text-gray-500">({filtered.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-5">
            <Heart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhuma instituição cadastrada</p>
            <p className="text-gray-600 text-sm mt-1">
              Cadastre a primeira para habilitar o modo solidário nos anúncios.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filtered.map((c) => {
              const busy = busyId === c.id;
              return (
                <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm text-white font-medium flex items-center gap-1.5">
                        <span className="truncate">{c.name}</span>
                        {c.verified && <BadgeCheck className="w-4 h-4 text-brand-blue flex-shrink-0" />}
                        {!c.active && (
                          <span className="text-[10px] bg-gray-600/40 text-gray-400 font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            Inativa
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {c.email || 'sem e-mail'} · {c.donations_count} doações · {c.donors_count} doadores
                        {c.pending_amount > 0 && ` · ${brl(c.pending_amount)} pendente`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-sm text-emerald-400 font-display font-semibold">
                        {brl(c.real_received)}
                      </span>
                      <span className="block text-[10px] text-gray-600">repassado</span>
                    </div>

                    {busy ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <button
                          onClick={() => patch(c.id, { verified: !c.verified })}
                          className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${
                            c.verified
                              ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                              : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'
                          }`}
                          title={c.verified ? 'Remover verificação' : 'Verificar instituição'}
                        >
                          {c.verified ? 'Verificada' : 'Verificar'}
                        </button>
                        <button
                          onClick={() => patch(c.id, { active: !c.active })}
                          title={c.active ? 'Desativar' : 'Ativar'}
                        >
                          {c.active
                            ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                            : <ToggleLeft className="w-6 h-6 text-gray-600" />}
                        </button>
                        <button
                          onClick={() => remove(c)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
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
    </div>
  );
}
