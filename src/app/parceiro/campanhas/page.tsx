'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Loader2, RefreshCw, X, Send, AlertTriangle, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetchJson, adminFetch } from '@/lib/admin-fetch';

interface Campaign {
  id: string; title: string; description: string | null;
  campaign_type: string; status: string; rejection_reason: string | null;
  starts_at: string | null; ends_at: string | null;
  budget: number | null; amount_paid: number;
  target_cities: string[] | null; target_states: string[] | null;
  benefit: { id: string; title: string } | null;
  impressions: number | null; reach: number | null;
  clicks: number | null; ctr: number | null; measured: boolean;
}

interface BenefitOption { id: string; title: string; status: string }

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-gray-700 text-gray-400' },
  pending: { label: 'Em análise', cls: 'bg-amber-500/15 text-amber-400' },
  active: { label: 'No ar', cls: 'bg-emerald-500/15 text-emerald-400' },
  paused: { label: 'Pausada', cls: 'bg-blue-500/15 text-blue-400' },
  finished: { label: 'Encerrada', cls: 'bg-gray-700 text-gray-500' },
  rejected: { label: 'Rejeitada', cls: 'bg-red-500/15 text-red-400' },
};

const TYPES = [
  { v: 'sponsored', l: 'Patrocinada' },
  { v: 'banner', l: 'Banner' },
  { v: 'geo_ad', l: 'Anúncio geolocalizado' },
  { v: 'seasonal', l: 'Sazonal' },
  { v: 'highlight', l: 'Destaque' },
];

export default function ParceiroCampanhas() {
  const [data, setData] = useState<{ campaigns: Campaign[]; counts: Record<string, number>; canManage: boolean } | null>(null);
  const [benefits, setBenefits] = useState<BenefitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', campaign_type: 'sponsored', benefit_id: '',
    target_cities: '', target_states: '', budget: '', starts_at: '', ends_at: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([
        adminFetchJson<{ campaigns: Campaign[]; counts: Record<string, number>; canManage: boolean }>('/api/partner/campaigns'),
        adminFetchJson<{ benefits: BenefitOption[] }>('/api/partner/benefits?status=approved'),
      ]);
      setData(c);
      setBenefits(b.benefits);
    } catch { /* sem dados = estado vazio */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(submit: boolean) {
    setSaving(true);
    setFormError('');
    try {
      const res = await adminFetch('/api/partner/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          campaign_type: form.campaign_type,
          benefit_id: form.benefit_id || null,
          target_cities: form.target_cities ? form.target_cities.split(',').map((s) => s.trim()).filter(Boolean) : null,
          target_states: form.target_states ? form.target_states.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : null,
          budget: form.budget ? Number(form.budget) : null,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
          submit,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error || 'Não foi possível salvar'); return; }
      setModal(false);
      setForm({ title: '', description: '', campaign_type: 'sponsored', benefit_id: '', target_cities: '', target_states: '', budget: '', starts_at: '', ends_at: '' });
      load();
    } catch {
      setFormError('Falha de conexão');
    } finally { setSaving(false); }
  }

  async function changeStatus(id: string, status: string) {
    await adminFetch('/api/partner/campaigns', { method: 'PATCH', body: JSON.stringify({ id, status }) });
    load();
  }

  const canManage = data?.canManage ?? false;

  return (
    <div className="space-y-5">
      {!canManage && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            Modo consulta. A criação de campanhas é liberada para gestores de empresas aprovadas.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">
          {data ? `${data.counts.active} no ar · ${data.counts.pending} em análise` : ''}
        </p>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </button>
          {canManage && (
            <button onClick={() => setModal(true)}
              className="flex items-center gap-1.5 text-xs bg-brand-purple text-white px-3 py-1.5 rounded-xl">
              <Plus className="w-3.5 h-3.5" /> Nova campanha
            </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>
      ) : !data?.campaigns.length ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 py-16 text-center">
          <Megaphone className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhuma campanha criada.</p>
          <p className="text-xs text-gray-600 mt-1">
            Campanhas divulgam seus benefícios para usuários da sua região dentro do aplicativo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.campaigns.map((c) => {
            const st = STATUS[c.status] ?? { label: c.status, cls: 'bg-gray-700 text-gray-400' };
            return (
              <div key={c.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-white">{c.title}</h4>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', st.cls)}>{st.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {TYPES.find((t) => t.v === c.campaign_type)?.l ?? c.campaign_type}
                      {c.benefit && ` · ${c.benefit.title}`}
                      {c.target_cities?.length ? ` · ${c.target_cities.join(', ')}` : ''}
                    </p>
                  </div>
                  {canManage && c.status === 'draft' && (
                    <button onClick={() => changeStatus(c.id, 'pending')}
                      className="text-xs text-white bg-brand-purple px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <Send className="w-3 h-3" /> Enviar para análise
                    </button>
                  )}
                  {canManage && c.status === 'active' && (
                    <button onClick={() => changeStatus(c.id, 'paused')}
                      className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <Pause className="w-3 h-3" /> Pausar
                    </button>
                  )}
                </div>

                {c.status === 'rejected' && c.rejection_reason && (
                  <p className="text-xs text-red-400 mt-3 bg-red-500/10 rounded-xl px-3 py-2">
                    Motivo: {c.rejection_reason}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-gray-700/50">
                  {!c.measured ? (
                    <p className="text-xs text-gray-600">
                      Sem medição de desempenho ainda — os números aparecem depois que a
                      campanha for exibida no aplicativo.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { l: 'Impressões', v: c.impressions?.toLocaleString('pt-BR') ?? '—' },
                        { l: 'Alcance', v: c.reach?.toLocaleString('pt-BR') ?? '—' },
                        { l: 'Cliques', v: c.clicks?.toLocaleString('pt-BR') ?? '—' },
                        { l: 'CTR', v: c.ctr != null ? `${c.ctr}%` : '—' },
                      ].map((m) => (
                        <div key={m.l}>
                          <span className="text-[10px] text-gray-600 block">{m.l}</span>
                          <span className="text-sm text-white font-medium">{m.v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg my-8">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Nova campanha</h3>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Título</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-purple" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Tipo</label>
                  <select value={form.campaign_type} onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                    {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Benefício divulgado</label>
                  <select value={form.benefit_id} onChange={(e) => setForm({ ...form, benefit_id: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                    <option value="">Nenhum</option>
                    {benefits.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Cidades (separadas por vírgula)</label>
                  <input value={form.target_cities} onChange={(e) => setForm({ ...form, target_cities: e.target.value })}
                    placeholder="São Paulo, Campinas"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">UFs</label>
                  <input value={form.target_states} onChange={(e) => setForm({ ...form, target_states: e.target.value })}
                    placeholder="SP, RJ"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Investimento (R$)</label>
                  <input value={form.budget} inputMode="decimal" onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Início</label>
                  <input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">Término</label>
                  <input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none" />
                </div>
              </div>
              {formError && <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{formError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-700 flex gap-2 justify-end">
              <button onClick={() => save(false)} disabled={saving}
                className="text-xs text-gray-300 bg-gray-700 px-4 py-2 rounded-xl disabled:opacity-50">Salvar rascunho</button>
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
