'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Gem, RefreshCw, Loader2, AlertTriangle, Store, Users as UsersIcon, TrendingUp,
  TrendingDown, MapPin, Ticket, Repeat, DollarSign, BarChart3, Megaphone, Building2,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: number) => v.toLocaleString('pt-BR');
const metric = (v: number | null) => v === null ? '—' : num(v);

const PERIODS = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '90 dias' },
  { id: '365', label: '12 meses' },
];

function Kpi({ icon: Icon, label, value, growth, hint, href }: {
  icon: React.ElementType; label: string; value: string | number;
  growth?: number; hint?: string; href?: string;
}) {
  const body = (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 h-full hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
      {growth !== undefined && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${growth >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {growth >= 0 ? '+' : ''}{growth}% vs período anterior
        </p>
      )}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function RankList({ title, icon: Icon, items, empty }: {
  title: string; icon: React.ElementType;
  items: { label: string; count: number; volume: number }[]; empty: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-purple" /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">{empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.label}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm text-gray-300 truncate">{i.label}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {i.count} · {brl(i.volume)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-purple rounded-full"
                  style={{ width: `${(i.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminClubPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [partnerId, setPartnerId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ period });
      if (category) qs.set('category', category);
      if (city) qs.set('city', city);
      if (state) qs.set('state', state);
      if (partnerId) qs.set('partner_id', partnerId);
      setData(await adminFetchJson<any>(`/api/admin/club-metrics?${qs.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar métricas');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, category, city, state, partnerId]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  const k = data?.kpis ?? {};
  const av = data?.filters?.available ?? {};
  const semDados = k.redemptions === 0 && k.active_partners === 0;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                period === p.id ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={load}
            className="p-2 rounded-xl bg-gray-700 text-gray-400 hover:text-white transition-colors ml-auto flex-shrink-0"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="">Todas as categorias</option>
            {(av.categories ?? []).map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="">Todos os estados</option>
            {(av.states ?? []).map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="">Todas as cidades</option>
            {(av.cities ?? []).map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="">Todos os parceiros</option>
            {(av.partners ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {semDados && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Gem className="w-5 h-5 text-brand-purple flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300 font-medium">O Clube de Benefícios ainda não tem movimento</p>
            <p className="text-xs text-gray-500 mt-1">
              Cadastre e aprove empresas parceiras em{' '}
              <Link href="/admin/partners" className="text-brand-purple hover:underline">Parceiros</Link>.
              Os indicadores passam a ser calculados assim que houver benefícios publicados e utilizados.
            </p>
          </div>
        </div>
      )}

      {/* Ecossistema */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Ecossistema</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={Store} label="Parceiros ativos" value={num(k.active_partners ?? 0)}
               hint={`${k.pending_partners ?? 0} aguardando análise`} href="/admin/partners" />
          <Kpi icon={TrendingUp} label="Novos parceiros" value={num(k.new_partners ?? 0)} hint="no período" />
          <Kpi icon={Building2} label="Unidades ativas" value={`${k.active_units ?? 0}/${k.total_units ?? 0}`} />
          <Kpi icon={Ticket} label="Benefícios publicados" value={num(k.published_benefits ?? 0)}
               hint={`${k.pending_benefits ?? 0} aguardando aprovação`} href="/admin/benefits" />
        </div>
      </div>

      {/* Utilização */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Utilização</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={Ticket} label="Benefícios utilizados" value={num(k.redemptions ?? 0)}
               growth={k.redemptions_growth} href="/admin/redemptions" />
          <Kpi icon={UsersIcon} label="Usuários alcançados" value={num(k.unique_users ?? 0)}
               hint={`${k.avg_uses_per_user ?? 0} utilizações por usuário`} />
          <Kpi icon={Repeat} label="Taxa de recorrência" value={`${k.recurrence_rate ?? 0}%`}
               hint={`${k.recurring_users ?? 0} usuários recorrentes`} />
          <Kpi icon={TrendingUp} label="Novos clientes enviados" value={num(k.new_customers ?? 0)}
               hint="primeira compra via clube" />
        </div>
      </div>

      {/* Financeiro */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Financeiro</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi icon={DollarSign} label="Volume movimentado" value={brl(k.volume ?? 0)} growth={k.volume_growth} />
          <Kpi icon={Ticket} label="Desconto concedido" value={brl(k.discount_granted ?? 0)} />
          <Kpi icon={BarChart3} label="Ticket médio" value={brl(k.avg_ticket ?? 0)} />
          <Kpi icon={Megaphone} label="Receita de publicidade" value={brl(k.ad_revenue ?? 0)}
               hint={`${k.active_campaigns ?? 0} campanhas ativas`} href="/admin/campaigns" />
        </div>
      </div>

      {!data?.has_display_metrics && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300 font-medium">Impressões e cliques: {metric(k.impressions)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Estas métricas dependem do registro de eventos de exibição no aplicativo
              (tabela <code className="text-gray-400">campaign_metrics</code>). Enquanto não houver
              instrumentação, elas são exibidas como &quot;—&quot;. Todos os demais indicadores
              desta página vêm de eventos reais de utilização.
            </p>
          </div>
        </div>
      )}

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankList title="Categorias com maior utilização" icon={Ticket}
                  items={data?.top_categories ?? []} empty="Nenhuma utilização no período." />
        <RankList title="Cidades com maior atividade" icon={MapPin}
                  items={data?.top_cities ?? []} empty="Nenhuma utilização vinculada a unidades." />
        <RankList title="Parceiros com melhor desempenho" icon={Store}
                  items={data?.top_partners ?? []} empty="Nenhum parceiro com utilizações." />
        <RankList title="Benefícios mais utilizados" icon={Gem}
                  items={data?.top_benefits ?? []} empty="Nenhum benefício utilizado." />
      </div>

      {/* Campanhas */}
      {(data?.top_campaigns ?? []).length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-brand-purple" /> Campanhas com melhor desempenho
            </h3>
          </div>
          <div className="divide-y divide-gray-700/50">
            {data.top_campaigns.map((c: any) => (
              <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.partner_name} · {c.type}</p>
                </div>
                <div className="flex gap-5 text-right flex-shrink-0">
                  <div>
                    <p className="text-[11px] text-gray-500">Impressões</p>
                    <p className="text-sm text-white">{metric(c.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">CTR</p>
                    <p className="text-sm text-white">{c.ctr === null ? '—' : `${c.ctr}%`}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Utilizações</p>
                    <p className="text-sm text-white">{c.redemptions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
