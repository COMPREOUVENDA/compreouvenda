'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Ticket, Megaphone, QrCode, Store, Users, TrendingUp, Star,
  Loader2, RefreshCw, AlertTriangle, Info, XCircle, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Kpis {
  units: number; activeUnits: number;
  activeBenefits: number; pendingBenefits: number;
  activeCampaigns: number; pendingCampaigns: number;
  redemptions: number; redemptions30d: number;
  customers: number; newCustomers: number; returningCustomers: number;
  volume: number; discountGiven: number;
  rating: number; ratingCount: number;
  impressions: number | null; reach: number | null;
  clicks: number | null; ctr: number | null;
}

interface UnitRow {
  id: string; name: string; city: string; state: string;
  is_active: boolean; redemptions: number; volume: number;
}

interface Data {
  partner: { trade_name: string; status: string; plan: string; category: string };
  role: string;
  canManage: boolean;
  kpis: Kpis;
  units: UnitRow[];
  pendingDocuments: number;
  alerts: { type: 'info' | 'warning' | 'error'; message: string }[];
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ParceiroDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await adminFetchJson<Data>('/api/partner/dashboard'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-sm text-red-300">{error}</div>
    );
  }
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      {/* Alertas de pendência da própria empresa */}
      {data.alerts.map((a, i) => {
        const Icon = a.type === 'error' ? XCircle : a.type === 'warning' ? AlertTriangle : Info;
        return (
          <div key={i} className={cn(
            'rounded-2xl px-5 py-4 flex items-start gap-3 border',
            a.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : a.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
          )}>
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{a.message}</p>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl text-white">{data.partner.trade_name}</h2>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            {data.partner.category} · plano {data.partner.plan}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-700 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Benefícios ativos', value: k.activeBenefits, icon: Ticket, href: '/parceiro/beneficios',
            hint: k.pendingBenefits > 0 ? `${k.pendingBenefits} em análise` : undefined },
          { label: 'Campanhas ativas', value: k.activeCampaigns, icon: Megaphone, href: '/parceiro/campanhas',
            hint: k.pendingCampaigns > 0 ? `${k.pendingCampaigns} em análise` : undefined },
          { label: 'Benefícios utilizados', value: k.redemptions, icon: QrCode, href: '/parceiro/validar',
            hint: `${k.redemptions30d} nos últimos 30 dias` },
          { label: 'Unidades', value: `${k.activeUnits}/${k.units}`, icon: Store, href: '/parceiro/unidades',
            hint: 'ativas / cadastradas' },
        ].map((m) => (
          <Link key={m.label} href={m.href}
            className="bg-gray-800 rounded-2xl border border-gray-700 p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{m.label}</span>
              <m.icon className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-2xl font-display font-bold text-white mt-1">{m.value}</p>
            {m.hint && <p className="text-[11px] text-gray-600 mt-0.5">{m.hint}</p>}
          </Link>
        ))}
      </div>

      {/* Resultado comercial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 lg:col-span-2">
          <h3 className="font-display font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Resultado gerado pelo COMPREOUVENDA
          </h3>
          <p className="text-[11px] text-gray-600 mb-4">
            Apurado a partir das validações confirmadas no seu balcão.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Volume em compras', value: brl(k.volume) },
              { label: 'Desconto concedido', value: brl(k.discountGiven) },
              { label: 'Clientes atendidos', value: k.customers },
              { label: 'Clientes novos', value: k.newCustomers },
            ].map((m) => (
              <div key={m.label}>
                <span className="text-[11px] text-gray-500 block">{m.label}</span>
                <span className="text-lg font-display font-bold text-white">{m.value}</span>
              </div>
            ))}
          </div>
          {k.customers > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center gap-2 text-xs text-gray-400">
              <Users className="w-3.5 h-3.5" />
              {k.returningCustomers} cliente{k.returningCustomers === 1 ? '' : 's'} voltaram mais de uma vez
              <span className="text-gray-600">
                ({Math.round((k.returningCustomers / k.customers) * 100)}% de recorrência)
              </span>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-brand-purple" /> Alcance das campanhas
          </h3>
          {k.impressions === null ? (
            <div className="text-sm text-gray-500 space-y-2">
              <p>Ainda sem medição de alcance.</p>
              <p className="text-[11px] text-gray-600">
                Impressões e cliques passam a aparecer aqui assim que suas campanhas
                entrarem no ar e forem exibidas no aplicativo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Impressões', value: k.impressions.toLocaleString('pt-BR') },
                { label: 'Alcance', value: (k.reach ?? 0).toLocaleString('pt-BR') },
                { label: 'Cliques', value: (k.clicks ?? 0).toLocaleString('pt-BR') },
                { label: 'CTR', value: k.ctr != null ? `${k.ctr}%` : '—' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{m.label}</span>
                  <span className="text-sm text-white font-medium">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between">
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" /> Avaliação
            </span>
            <span className="text-sm text-white font-medium">
              {k.ratingCount > 0 ? `${k.rating.toFixed(1)} (${k.ratingCount})` : 'sem avaliações'}
            </span>
          </div>
        </div>
      </div>

      {/* Desempenho por unidade */}
      {data.units.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-display font-semibold text-white">Desempenho por unidade</h3>
            <Link href="/parceiro/unidades" className="text-xs text-brand-purple hover:underline flex items-center gap-1">
              Gerenciar <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700/50">
            {data.units.map((u) => (
              <div key={u.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    {u.name}
                    {!u.is_active && <span className="ml-2 text-[10px] text-gray-500">(inativa)</span>}
                  </p>
                  <p className="text-xs text-gray-500">{u.city}/{u.state}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-white font-medium">{u.redemptions} utilizações</p>
                  <p className="text-xs text-gray-500">{brl(u.volume)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
