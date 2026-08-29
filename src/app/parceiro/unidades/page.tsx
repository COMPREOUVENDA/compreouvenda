'use client';

import { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Loader2, RefreshCw, X, MapPin, AlertTriangle, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetchJson, adminFetch } from '@/lib/admin-fetch';

interface Unit {
  id: string; name: string; street: string | null; number: string | null;
  neighborhood: string | null; city: string; state: string; zip_code: string | null;
  phone: string | null; is_active: boolean;
  redemptions: number; volume: number;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ParceiroUnidades() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Unit | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '', street: '', number: '', neighborhood: '',
    city: '', state: '', zip_code: '', phone: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminFetchJson<{ units: Unit[]; canManage: boolean }>('/api/partner/units');
      setUnits(d.units);
      setCanManage(d.canManage);
    } catch { /* estado vazio */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm({ name: '', street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '', phone: '' });
    setFormError('');
    setModal('new');
  }

  function openEdit(u: Unit) {
    setForm({
      name: u.name, street: u.street ?? '', number: u.number ?? '',
      neighborhood: u.neighborhood ?? '', city: u.city, state: u.state,
      zip_code: u.zip_code ?? '', phone: u.phone ?? '',
    });
    setFormError('');
    setModal(u);
  }

  async function save() {
    setSaving(true);
    setFormError('');
    const isNew = modal === 'new';
    try {
      const res = await adminFetch('/api/partner/units', {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify(isNew ? form : { ...form, id: (modal as Unit).id }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || 'Não foi possível salvar'); return; }
      setModal(null);
      load();
    } catch {
      setFormError('Falha de conexão');
    } finally { setSaving(false); }
  }

  async function toggle(u: Unit) {
    await adminFetch('/api/partner/units', {
      method: 'PATCH',
      body: JSON.stringify({ id: u.id, is_active: !u.is_active }),
    });
    load();
  }

  return (
    <div className="space-y-5">
      {!canManage && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            Modo consulta. O cadastro de unidades é liberado para gestores de empresas aprovadas.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {units.filter((u) => u.is_active).length} de {units.length} unidades ativas
        </p>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </button>
          {canManage && (
            <button onClick={openNew} className="flex items-center gap-1.5 text-xs bg-brand-purple text-white px-3 py-1.5 rounded-xl">
              <Plus className="w-3.5 h-3.5" /> Nova unidade
            </button>
          )}
        </div>
      </div>

      {loading && !units.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>
      ) : !units.length ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 py-16 text-center">
          <Store className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhuma unidade cadastrada.</p>
          <p className="text-xs text-gray-600 mt-1">
            Seus benefícios só aparecem no aplicativo depois que ao menos uma unidade for cadastrada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {units.map((u) => (
            <div key={u.id} className={cn(
              'bg-gray-800 rounded-2xl border p-5',
              u.is_active ? 'border-gray-700' : 'border-gray-700/50 opacity-60'
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-medium text-white">{u.name}</h4>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {[u.street, u.number, u.neighborhood].filter(Boolean).join(', ') || 'endereço não informado'}
                  </p>
                  <p className="text-xs text-gray-600">{u.city}/{u.state}</p>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                  u.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-700 text-gray-500'
                )}>
                  {u.is_active ? 'ativa' : 'inativa'}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700/50">
                <div>
                  <span className="text-[10px] text-gray-600 block">Utilizações</span>
                  <span className="text-sm text-white font-medium">{u.redemptions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-600 block">Volume gerado</span>
                  <span className="text-sm text-white font-medium">{brl(u.volume)}</span>
                </div>
                {canManage && (
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => openEdit(u)}
                      className="text-xs text-gray-400 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-xl">
                      Editar
                    </button>
                    <button onClick={() => toggle(u)}
                      className="text-xs text-gray-400 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <Power className="w-3 h-3" /> {u.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">
                {modal === 'new' ? 'Nova unidade' : 'Editar unidade'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Nome da unidade</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Loja Centro"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-purple" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 block mb-1.5">Rua</label>
                  <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Número</label>
                  <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Bairro</label>
                  <input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Cidade</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">UF</label>
                  <input value={form.state} maxLength={2}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">CEP</label>
                  <input value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Telefone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>
              {formError && <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{formError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
              <button onClick={save} disabled={saving}
                className="text-xs text-white bg-brand-purple px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
