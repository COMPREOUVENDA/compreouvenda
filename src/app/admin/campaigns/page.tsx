'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Megaphone, RefreshCw, Loader2, AlertTriangle, Store, Eye, MousePointerClick,
  Target, DollarSign, MapPin, Check, BarChart3,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-600/20 text-gray-400' },
  pending: { label: 'Em análise', color: 'bg-amber-500/10 text-amber-500' },
  active: { label: 'Ativa', color: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Pausada', color: 'bg-orange-500/10 text-orange-400' },
  finished: { label: 'Encerrada', color: 'bg-gray-600/20 text-gray-400' },
  rejected: { label: 'Rejeitada', color: 'bg-red-500/10 text-red-400' },
};

const TYPE_LABEL: Record<string, string> = {
  banner: 'Banner rotativo',
  sponsored: 'Patrocinada',
  geo_ad: 'Publicidade geolocalizada',
  seasonal: 'Sazonal',
  highlight: 'Destaque',
};

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Em análise' },
  { id: 'active', label: 'Ativas' },
  { id: 'paused', label: 'Pausadas' },
  { id: 'finished', label: 'Encerradas' },
  { id: 'rejected', label: 'Rejeitadas' },
];

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : 'sem prazo';
/** `null` = evento ainda não instrumentado no app. Nunca exibir 0 nesse caso. */
const metric = (v: number | null) => v === null ? '—' : v.toLocaleString('pt-BR');

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const showMsg = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ campaigns: any[]; kpis: any }>(
        `/api/admin/campaigns?status=${status}`
      );
      setCampaigns(data.campaigns);
      setKpis(data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar campanhas');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string, needsReason = false) => {
    let reason = '';
    if (needsReason) {
      reason = prompt('Motivo da rejeição (será enviado ao parceiro):')?.trim() ?? '';
      if (!reason) return;
    }
    setBusyId(id);
    setError(null);
    try {
      await adminFetchJson('/api/admin/campaigns', {
        method: 'PATCH',
        body: JSON.stringify({ id, action, reason }),
      });
      showMsg('Campanha atualizada.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const semInstrumentacao = campaigns.length > 0 && (kpis?.instrumented ?? 0) === 0;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Megaphone, label: 'Campanhas', value: kpis?.total ?? 0, tone: 'text-white' },
          { icon: Check, label: 'Ativas', value: kpis?.active ?? 0, tone: 'text-emerald-500' },
          { icon: AlertTriangle, label: 'Em análise', value: kpis?.pending ?? 0, tone: 'text-amber-500' },
          { icon: DollarSign, label: 'Receita de publicidade', value: brl(kpis?.revenue ?? 0), tone: 'text-white' },
        ].map((m) => (
          <div key={m.label} className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <m.icon className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
            <p className={`text-2xl font-display font-bold ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {semInstrumentacao && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300 font-medium">Métricas de exibição ainda não disponíveis</p>
            <p className="text-xs text-gray-500 mt-1">
              Impressões, alcance, cliques e CTR aparecerão quando o aplicativo registrar os eventos
              de exibição e clique em <code className="text-gray-400">campaign_metrics</code>. Até lá
              estes campos são exibidos como &quot;—&quot;, nunca como zero, para não sugerir desempenho
              ruim onde na verdade não há medição. As utilizações de benefício abaixo são reais.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              status === f.id ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={load}
          className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors ml-auto flex-shrink-0"
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 text-center py-20 px-5">
          <Megaphone className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhuma campanha encontrada</p>
          <p className="text-sm text-gray-500 mt-1">
            As campanhas são criadas pelas empresas no Portal do Parceiro e chegam aqui para aprovação.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const meta = STATUS_META[c.status] ?? { label: c.status, color: 'bg-gray-600/20 text-gray-400' };
            const busy = busyId === c.id;

            return (
              <div key={c.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{c.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                        {TYPE_LABEL[c.campaign_type] ?? c.campaign_type}
                      </span>
                    </div>

                    <Link
                      href={`/admin/partners/${c.partner_id}`}
                      className="text-xs text-gray-400 hover:text-brand-purple transition-colors mt-1 inline-flex items-center gap-1"
                    >
                      <Store className="w-3 h-3" /> {c.partner_name}
                    </Link>

                    {c.benefit_title && (
                      <p className="text-xs text-gray-500 mt-1">Benefício vinculado: {c.benefit_title}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span>{date(c.starts_at)} até {date(c.ends_at)}</span>
                      {c.budget && <span>Orçamento {brl(Number(c.budget))}</span>}
                      {c.amount_paid > 0 && (
                        <span className="text-emerald-500">Pago {brl(Number(c.amount_paid))}</span>
                      )}
                      {(c.target_cities?.length > 0 || c.radius_km) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {c.target_cities?.length > 0
                            ? c.target_cities.slice(0, 2).join(', ')
                            : `raio de ${c.radius_km} km`}
                        </span>
                      )}
                    </div>

                    {c.rejection_reason && (
                      <p className="text-xs text-red-400 mt-2">
                        <strong>Motivo:</strong> {c.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {busy ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        {(c.status === 'pending' || c.status === 'draft') && (
                          <>
                            <button
                              onClick={() => act(c.id, 'approve')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium hover:bg-emerald-500/20"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => act(c.id, 'reject', true)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <>
                            <button
                              onClick={() => act(c.id, 'pause')}
                              className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 text-xs font-medium hover:bg-orange-500/20"
                            >
                              Pausar
                            </button>
                            <button
                              onClick={() => act(c.id, 'finish')}
                              className="px-3 py-1.5 rounded-xl bg-gray-700 text-gray-300 text-xs font-medium hover:bg-gray-600"
                            >
                              Encerrar
                            </button>
                          </>
                        )}
                        {(c.status === 'paused' || c.status === 'rejected') && (
                          <button
                            onClick={() => act(c.id, 'resume')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium hover:bg-emerald-500/20"
                          >
                            Reativar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Desempenho */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-gray-700/50">
                  {[
                    { icon: Eye, label: 'Impressões', value: metric(c.impressions) },
                    { icon: Target, label: 'Alcance', value: metric(c.reach) },
                    { icon: MousePointerClick, label: 'Cliques', value: metric(c.clicks) },
                    { icon: BarChart3, label: 'CTR', value: c.ctr === null ? '—' : `${c.ctr}%` },
                    { icon: Check, label: 'Utilizações', value: c.redemptions },
                    { icon: DollarSign, label: 'Volume', value: brl(c.redemption_volume ?? 0) },
                  ].map((m) => (
                    <div key={m.label}>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <m.icon className="w-3 h-3" /> {m.label}
                      </span>
                      <span className="text-sm text-white font-medium">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
