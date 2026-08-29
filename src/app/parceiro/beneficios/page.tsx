'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Plus, Loader2, RefreshCw, X, Send, Save, Pause, Play, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetchJson, adminFetch } from '@/lib/admin-fetch';

interface Benefit {
  id: string; title: string; description: string | null;
  benefit_type: string; discount_percent: number | null; discount_value: number | null;
  min_purchase_value: number | null; category: string | null;
  starts_at: string | null; ends_at: string | null;
  total_quantity: number | null; used_quantity: number; remaining: number | null;
  status: string; rejection_reason: string | null;
  unit_ids: string[];
}

interface Data {
  benefits: Benefit[];
  counts: Record<string, number>;
  canManage: boolean;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-gray-700 text-gray-400' },
  pending: { label: 'Em análise', cls: 'bg-amber-500/15 text-amber-400' },
  approved: { label: 'No ar', cls: 'bg-emerald-500/15 text-emerald-400' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-500/15 text-red-400' },
  paused: { label: 'Pausado', cls: 'bg-blue-500/15 text-blue-400' },
  expired: { label: 'Encerrado', cls: 'bg-gray-700 text-gray-500' },
};

const TYPES = [
  { v: 'percent_discount', l: 'Desconto percentual' },
  { v: 'fixed_discount', l: 'Desconto em reais' },
  { v: 'cashback', l: 'Cashback' },
  { v: 'gift', l: 'Brinde' },
  { v: 'combo', l: 'Combo' },
  { v: 'free_shipping', l: 'Frete grátis' },
  { v: 'other', l: 'Outro' },
];

const FILTERS = ['all', 'approved', 'pending', 'draft', 'paused', 'rejected'] as const;

export default function ParceiroBeneficios() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [modal, setModal] = useState<Benefit | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', benefit_type: 'percent_discount',
    discount_percent: '', discount_value: '', min_purchase_value: '',
    terms: '', starts_at: '', ends_at: '', total_quantity: '',
  });

  const load = useCallback(async (f = filter) => {
    setLoading(true);
    try {
      setData(await adminFetchJson<Data>(`/api/partner/benefits?status=${f}`));
    } catch { /* estado de erro tratado pela ausência de dados */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(filter); }, [filter, load]);

  function openNew() {
    setForm({
      title: '', description: '', benefit_type: 'percent_discount',
      discount_percent: '', discount_value: '', min_purchase_value: '',
      terms: '', starts_at: '', ends_at: '', total_quantity: '',
    });
    setFormError('');
    setModal('new');
  }

  function openEdit(b: Benefit) {
    setForm({
      title: b.title,
      description: b.description ?? '',
      benefit_type: b.benefit_type,
      discount_percent: b.discount_percent?.toString() ?? '',
      discount_value: b.discount_value?.toString() ?? '',
      min_purchase_value: b.min_purchase_value?.toString() ?? '',
      terms: '',
      starts_at: b.starts_at?.slice(0, 10) ?? '',
      ends_at: b.ends_at?.slice(0, 10) ?? '',
      total_quantity: b.total_quantity?.toString() ?? '',
    });
    setFormError('');
    setModal(b);
  }

  async function save(submit: boolean) {
    setSaving(true);
    setFormError('');
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      benefit_type: form.benefit_type,
      discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
      discount_value: form.discount_value ? Number(form.discount_value) : null,
      min_purchase_value: form.min_purchase_value ? Number(form.min_purchase_value) : null,
      terms: form.terms || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      total_quantity: form.total_quantity ? Number(form.total_quantity) : null,
    };

    const isNew = modal === 'new';
    if (isNew) payload.submit = submit;
    else {
      payload.id = (modal as Benefit).id;
      if (submit) payload.status = 'pending';
    }

    try {
      const res = await adminFetch('/api/partner/benefits', {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || 'Não foi possível salvar'); return; }
      if (json.message) setNotice(json.message);
      setModal(null);
      load(filter);
    } catch {
      setFormError('Falha de conexão');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(b: Benefit, status: string) {
    const res = await adminFetch('/api/partner/benefits', {
      method: 'PATCH',
      body: JSON.stringify({ id: b.id, status }),
    });
    const json = await res.json();
    if (!res.ok) setNotice(json.error || 'Não foi possível alterar o status');
    load(filter);
  }

  const canManage = data?.canManage ?? false;

  return (
    <div className="space-y-5">
      {notice && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl px-5 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-200">{notice}</p>
          <button onClick={() => setNotice('')} className="text-blue-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {!canManage && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            Você está em modo consulta. A criação de benefícios é liberada para gestores
            de empresas já aprovadas.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-xl transition-colors',
                filter === f ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
            >
              {f === 'all' ? 'Todos' : STATUS[f]?.label ?? f}
              {data && f !== 'all' && data.counts[f] > 0 && (
                <span className="ml-1.5 opacity-70">{data.counts[f]}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(filter)} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </button>
          {canManage && (
            <button onClick={openNew}
              className="flex items-center gap-1.5 text-xs bg-brand-purple text-white px-3 py-1.5 rounded-xl hover:opacity-90">
              <Plus className="w-3.5 h-3.5" /> Novo benefício
            </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>
      ) : !data?.benefits.length ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 py-16 text-center">
          <Ticket className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhum benefício {filter !== 'all' ? 'nesse status' : 'cadastrado'}.</p>
          {canManage && filter === 'all' && (
            <button onClick={openNew} className="mt-4 text-xs bg-brand-purple text-white px-4 py-2 rounded-xl">
              Criar o primeiro benefício
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.benefits.map((b) => {
            const st = STATUS[b.status] ?? { label: b.status, cls: 'bg-gray-700 text-gray-400' };
            return (
              <div key={b.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-medium text-white">{b.title}</h4>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', st.cls)}>
                    {st.label}
                  </span>
                </div>

                {b.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{b.description}</p>}

                <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                  {b.discount_percent != null && <span className="text-brand-purple font-medium">{b.discount_percent}% OFF</span>}
                  {b.discount_value != null && (
                    <span className="text-brand-purple font-medium">
                      {Number(b.discount_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} OFF
                    </span>
                  )}
                  <span>{b.used_quantity} utilizações</span>
                  {b.remaining != null && <span>{b.remaining} restantes</span>}
                  {b.ends_at && <span>até {new Date(b.ends_at).toLocaleDateString('pt-BR')}</span>}
                </div>

                {b.status === 'rejected' && b.rejection_reason && (
                  <p className="text-xs text-red-400 mt-3 bg-red-500/10 rounded-xl px-3 py-2">
                    Motivo: {b.rejection_reason}
                  </p>
                )}

                {canManage && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-700/50 flex-wrap">
                    <button onClick={() => openEdit(b)}
                      className="text-xs text-gray-400 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-xl">
                      Editar
                    </button>
                    {b.status === 'draft' && (
                      <button onClick={() => changeStatus(b, 'pending')}
                        className="text-xs text-white bg-brand-purple px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Send className="w-3 h-3" /> Enviar para análise
                      </button>
                    )}
                    {b.status === 'approved' && (
                      <button onClick={() => changeStatus(b, 'paused')}
                        className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Pause className="w-3 h-3" /> Pausar
                      </button>
                    )}
                    {b.status === 'paused' && (
                      <button onClick={() => changeStatus(b, 'pending')}
                        className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Play className="w-3 h-3" /> Reativar
                      </button>
                    )}
                    {b.status === 'rejected' && (
                      <button onClick={() => changeStatus(b, 'pending')}
                        className="text-xs text-white bg-brand-purple px-3 py-1.5 rounded-xl">
                        Reenviar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg my-8">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">
                {modal === 'new' ? 'Novo benefício' : 'Editar benefício'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modal !== 'new' && (modal as Benefit).status === 'approved' && (
                <p className="text-xs text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2">
                  Este benefício está no ar. Ao salvar alterações ele volta para análise
                  e sai temporariamente do aplicativo.
                </p>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Título</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: 20% de desconto no almoço"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-purple" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-purple resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Tipo</label>
                  <select value={form.benefit_type} onChange={(e) => setForm({ ...form, benefit_type: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                    {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">
                    {form.benefit_type === 'percent_discount' ? 'Percentual (%)' : 'Valor (R$)'}
                  </label>
                  <input
                    value={form.benefit_type === 'percent_discount' ? form.discount_percent : form.discount_value}
                    onChange={(e) => setForm(form.benefit_type === 'percent_discount'
                      ? { ...form, discount_percent: e.target.value }
                      : { ...form, discount_value: e.target.value })}
                    inputMode="decimal"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-purple" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Compra mínima (R$)</label>
                  <input value={form.min_purchase_value} inputMode="decimal"
                    onChange={(e) => setForm({ ...form, min_purchase_value: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">
                    Quantidade <span className="text-gray-600">(vazio = ilimitado)</span>
                  </label>
                  <input value={form.total_quantity} inputMode="numeric"
                    onChange={(e) => setForm({ ...form, total_quantity: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Início</label>
                  <input type="date" value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Término</label>
                  <input type="date" value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{formError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-700 flex gap-2 justify-end">
              <button onClick={() => save(false)} disabled={saving}
                className="text-xs text-gray-300 bg-gray-700 px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50">
                <Save className="w-3.5 h-3.5" /> Salvar rascunho
              </button>
              <button onClick={() => save(true)} disabled={saving}
                className="text-xs text-white bg-brand-purple px-4 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar para análise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
