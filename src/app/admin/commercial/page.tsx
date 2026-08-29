'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, Percent, Megaphone, FileBarChart,
  Crown, Gift, Target, Users, HandHeart, Layers,
  BarChart3, Activity, CheckCircle, Loader2, RefreshCw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Package, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { adminFetchJson } from '@/lib/admin-fetch';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'fees', label: 'Taxas & Repasses', icon: Percent },
  { id: 'plans', label: 'Planos & Serviços', icon: Crown },
  { id: 'ads', label: 'Destaques Pagos', icon: Megaphone },
  { id: 'reports', label: 'Relatórios', icon: FileBarChart },
  { id: 'coupons', label: 'Cupons', icon: Gift },
];

interface Revenue {
  gmvMonth: number; gmvTotal: number; growth: number | null;
  platformFee: number; platformFeeMonth: number; gatewayFee: number;
  commissions: number; donations: number; sellerPayouts: number;
  ticketMedio: number; salesCount: number; ordersCount: number;
  conversionRate: number; mrr: number; activeSubscribers: number;
  totalUsers: number; totalProducts: number;
}

interface Plan {
  id: string; name: string; price_monthly: number;
  features: string[]; active: boolean; subscribers: number;
}

interface Coupon {
  id: string; code: string; type: string; value: number;
  min_order_value: number; max_discount: number | null;
  usage_count: number; usage_limit: number | null;
  valid_until: string | null; active: boolean;
}

interface ReportRow {
  label: string; vendas: number; receita: number;
  plataforma: number; comissoes: number; doacoes: number;
}

interface Data {
  revenue: Revenue;
  daily: { day: string; value: number; bar: number }[];
  plans: Plan[];
  coupons: Coupon[];
  featured: unknown[];
  commissions: unknown[];
  reports: { daily: ReportRow[]; monthly: ReportRow[] };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const compact = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}K` : brl(v);

/** Aviso padrão para áreas cujo backend ainda não existe. */
function PendingNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/40 border border-dashed border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
      <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-gray-400">{children}</p>
    </div>
  );
}

export default function AdminCommercialPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly'>('daily');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetchJson<Data>('/api/admin/commercial'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados comerciais');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const r = data?.revenue;

  // Cada card aponta para uma métrica que existe no banco.
  const stats = r ? [
    { label: 'GMV do mês', value: brl(r.gmvMonth), icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400', period: 'Volume transacionado', change: r.growth },
    { label: 'Ticket médio', value: brl(r.ticketMedio), icon: ShoppingCart, color: 'bg-brand-blue/10 text-brand-blue', period: `${r.salesCount} vendas pagas`, change: null },
    { label: 'Conversão de pedidos', value: `${r.conversionRate.toFixed(1)}%`, icon: Target, color: 'bg-brand-purple/10 text-brand-purple', period: `${r.salesCount} de ${r.ordersCount} pedidos`, change: null },
    { label: 'Receita da plataforma', value: brl(r.platformFee), icon: Layers, color: 'bg-brand-orange/10 text-brand-orange', period: `${brl(r.platformFeeMonth)} neste mês`, change: null },
    { label: 'Comissões de revenda', value: brl(r.commissions), icon: Users, color: 'bg-brand-gold/10 text-brand-gold', period: 'Pagas a revendedores', change: null },
    { label: 'Doações geradas', value: brl(r.donations), icon: HandHeart, color: 'bg-emerald-500/10 text-emerald-400', period: 'Modo solidário', change: null },
    { label: 'Assinaturas (MRR)', value: brl(r.mrr), icon: Crown, color: 'bg-amber-500/10 text-amber-400', period: `${r.activeSubscribers} assinantes ativos`, change: null },
    { label: 'Base cadastrada', value: String(r.totalUsers), icon: Package, color: 'bg-brand-pink/10 text-brand-pink', period: `${r.totalProducts} produtos`, change: null },
  ] : [];

  const reportRows = data?.reports[reportPeriod] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Comercial &amp; Monetização</h1>
          <p className="text-sm text-gray-500 mt-1">Receita, taxas, planos e campanhas — dados do banco</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Activity className="w-3 h-3" /> Dados reais
          </span>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-700"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/25'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* ==================== DASHBOARD ==================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.color)}>
                        <stat.icon className="w-4 h-4" />
                      </div>
                      {stat.change !== null && stat.change !== undefined && (
                        <span className={cn(
                          'text-[10px] font-bold flex items-center gap-0.5',
                          stat.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {stat.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {Math.abs(stat.change).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <span className="font-display font-bold text-xl text-white block">{stat.value}</span>
                    <span className="text-[10px] text-gray-500">{stat.label}</span>
                    <span className="block text-[9px] text-gray-600 mt-0.5">{stat.period}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Receita diária real */}
                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                  <h3 className="font-display font-semibold text-white mb-4">Receita dos últimos 7 dias</h3>
                  {data.daily.every((d) => d.value === 0) ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center">
                      <BarChart3 className="w-8 h-8 text-gray-700 mb-2" />
                      <p className="text-sm text-gray-500">Nenhuma venda nos últimos 7 dias</p>
                    </div>
                  ) : (
                    <div className="flex items-end gap-3 h-40">
                      {data.daily.map((d, i) => (
                        <div key={`${d.day}-${i}`} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[9px] text-gray-500">{compact(d.value)}</span>
                          <div
                            className="w-full rounded-t-lg bg-brand-purple/20 relative min-h-[4px]"
                            style={{ height: `${Math.max(d.bar, 2)}%` }}
                          >
                            <div className="absolute inset-0 rounded-t-lg bg-gradient-to-t from-brand-purple to-brand-blue opacity-80" />
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Composição do valor transacionado */}
                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                  <h3 className="font-display font-semibold text-white mb-1">Composição do valor transacionado</h3>
                  <p className="text-[11px] text-gray-600 mb-4">
                    Somatório real de {r!.salesCount} pedido(s) pago(s)
                  </p>
                  {r!.gmvTotal === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">
                      Ainda não há pedidos pagos para compor a distribuição.
                    </p>
                  ) : (
                    <>
                      <div className="flex rounded-full h-4 overflow-hidden mb-4">
                        {([
                          [r!.sellerPayouts, 'bg-brand-orange'],
                          [r!.platformFee, 'bg-brand-purple'],
                          [r!.commissions, 'bg-brand-blue'],
                          [r!.donations, 'bg-emerald-500'],
                          [r!.gatewayFee, 'bg-gray-500'],
                        ] as const).map(([value, color], i) => (
                          <div
                            key={i}
                            className={cn('h-full', color)}
                            style={{ width: `${(value / r!.gmvTotal) * 100}%` }}
                          />
                        ))}
                      </div>
                      <div className="space-y-2.5">
                        {([
                          ['Vendedor (líquido)', r!.sellerPayouts, 'bg-brand-orange'],
                          ['Plataforma (taxa)', r!.platformFee, 'bg-brand-purple'],
                          ['Comissões', r!.commissions, 'bg-brand-blue'],
                          ['Doações', r!.donations, 'bg-emerald-500'],
                          ['Gateway', r!.gatewayFee, 'bg-gray-500'],
                        ] as const).map(([label, value, color]) => (
                          <div key={label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn('w-3 h-3 rounded-full', color)} />
                              <span className="text-sm text-gray-300">{label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-500">
                                {((value / r!.gmvTotal) * 100).toFixed(1)}%
                              </span>
                              <span className="text-sm text-white font-display font-semibold w-28 text-right">
                                {brl(value)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Funil com as etapas que o banco realmente registra */}
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                <h3 className="font-display font-semibold text-white mb-1">Funil de conversão</h3>
                <p className="text-[11px] text-gray-600 mb-4">
                  Etapas medidas: cadastro, anúncio publicado, pedido criado, pedido pago.
                  Visitas e visualizações dependem de analytics ainda não instrumentado.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { stage: 'Usuários cadastrados', value: r!.totalUsers, color: 'bg-gray-700' },
                    { stage: 'Produtos publicados', value: r!.totalProducts, color: 'bg-brand-blue/30' },
                    { stage: 'Pedidos criados', value: r!.ordersCount, color: 'bg-brand-orange/30' },
                    { stage: 'Pedidos pagos', value: r!.salesCount, color: 'bg-emerald-500/30' },
                  ].map((f) => (
                    <div key={f.stage} className="text-center">
                      <div className={cn('rounded-xl p-3 mb-2', f.color)}>
                        <span className="font-display font-bold text-lg text-white">{f.value}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{f.stage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAXAS ==================== */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                <h3 className="font-display font-semibold text-white mb-1">Taxas efetivamente praticadas</h3>
                <p className="text-[11px] text-gray-600 mb-5">
                  Percentuais calculados sobre {brl(r!.gmvTotal)} de volume transacionado.
                </p>
                {r!.gmvTotal === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    Sem pedidos pagos — nenhuma taxa foi aplicada ainda.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {([
                      ['Taxa da plataforma', r!.platformFee, 'Retida em cada venda'],
                      ['Taxa do gateway', r!.gatewayFee, 'Custo do processador de pagamento'],
                      ['Comissão de revenda', r!.commissions, 'Repassada a revendedores'],
                      ['Doação solidária', r!.donations, 'Destinada a instituições'],
                      ['Líquido do vendedor', r!.sellerPayouts, 'Valor efetivamente repassado'],
                    ] as const).map(([label, value, desc]) => (
                      <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-gray-700/50 last:border-0">
                        <div className="flex-1">
                          <span className="text-sm text-gray-200 font-medium">{label}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-display font-semibold text-white">{brl(value)}</span>
                          <span className="block text-xs text-gray-500">
                            {((value / r!.gmvTotal) * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <PendingNotice>
                A edição dos percentuais de taxa ainda não está ligada a{' '}
                <code className="text-gray-300">system_settings</code>. Enquanto isso, os valores
                aplicados são os definidos no cálculo do checkout.
              </PendingNotice>
            </div>
          )}

          {/* ==================== PLANOS ==================== */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {data.plans.length} plano(s) cadastrado(s) · {r!.activeSubscribers} assinante(s) ativo(s)
                </p>
                <Link
                  href="/admin/subscriptions"
                  className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  Ver assinaturas
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      'bg-gray-800 rounded-2xl border-2 p-6',
                      plan.subscribers > 0 ? 'border-brand-purple/50' : 'border-gray-700'
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display font-bold text-lg text-white">{plan.name}</h3>
                        <div className="flex items-baseline gap-0.5">
                          <span className="font-display font-bold text-2xl text-white">
                            {plan.price_monthly > 0 ? brl(plan.price_monthly) : 'Grátis'}
                          </span>
                          {plan.price_monthly > 0 && <span className="text-sm text-gray-500">/mês</span>}
                        </div>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-4">
                      {plan.features.slice(0, 6).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                      {plan.features.length === 0 && (
                        <li className="text-sm text-gray-600">Sem benefícios cadastrados</li>
                      )}
                    </ul>

                    <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {plan.subscribers.toLocaleString('pt-BR')} assinante(s)
                      </span>
                      <span className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        plan.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-600/10 text-gray-500'
                      )}>
                        {plan.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== DESTAQUES PAGOS ==================== */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              {data.featured.length === 0 ? (
                <div className="bg-gray-800 rounded-2xl border border-gray-700 py-16 text-center px-5">
                  <Megaphone className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">Nenhum destaque contratado</p>
                  <p className="text-gray-600 text-sm mt-1 max-w-md mx-auto">
                    A tabela <code className="text-gray-500">featured_products</code> existe e está
                    pronta, mas ainda não há fluxo de contratação de destaque no aplicativo do vendedor.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                  <p className="text-sm text-gray-400">
                    {data.featured.length} destaque(s) ativo(s).
                  </p>
                </div>
              )}
              <PendingNotice>
                Métricas de impressões, cliques e CTR exigem instrumentação de analytics,
                ainda não implementada.
              </PendingNotice>
            </div>
          )}

          {/* ==================== RELATÓRIOS ==================== */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(['daily', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setReportPeriod(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                      reportPeriod === p
                        ? 'bg-brand-purple text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                    )}
                  >
                    {p === 'daily' ? 'Por dia' : 'Por mês'}
                  </button>
                ))}
              </div>

              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                {reportRows.length === 0 ? (
                  <div className="text-center py-16 px-5">
                    <FileBarChart className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Sem vendas no período</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Os relatórios são gerados a partir dos pedidos pagos.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700 text-xs text-gray-500">
                          <th className="text-left px-5 py-3 font-medium">Período</th>
                          <th className="text-left px-5 py-3 font-medium">Vendas</th>
                          <th className="text-left px-5 py-3 font-medium">Receita</th>
                          <th className="text-left px-5 py-3 font-medium">Plataforma</th>
                          <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Comissões</th>
                          <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Doações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {reportRows.map((row, i) => (
                          <tr key={`${row.label}-${i}`} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-5 py-3 text-sm text-white">{row.label}</td>
                            <td className="px-5 py-3 text-sm text-gray-300">{row.vendas}</td>
                            <td className="px-5 py-3 text-sm text-white font-medium">{brl(row.receita)}</td>
                            <td className="px-5 py-3 text-sm text-emerald-500">{brl(row.plataforma)}</td>
                            <td className="px-5 py-3 text-sm text-gray-400 hidden sm:table-cell">{brl(row.comissoes)}</td>
                            <td className="px-5 py-3 text-sm text-brand-orange hidden sm:table-cell">{brl(row.doacoes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== CUPONS ==================== */}
          {activeTab === 'coupons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{data.coupons.length} cupom(ns) cadastrado(s)</p>
                <Link
                  href="/admin/coupons"
                  className="flex items-center gap-1.5 bg-brand-purple text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-purple/90 transition-colors"
                >
                  Gerenciar cupons
                </Link>
              </div>

              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                {data.coupons.length === 0 ? (
                  <div className="text-center py-16 px-5">
                    <Gift className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Nenhum cupom cadastrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700 text-xs text-gray-500">
                          <th className="text-left px-5 py-3 font-medium">Código</th>
                          <th className="text-left px-5 py-3 font-medium">Desconto</th>
                          <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Pedido mínimo</th>
                          <th className="text-left px-5 py-3 font-medium">Usos</th>
                          <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Validade</th>
                          <th className="text-left px-5 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {data.coupons.map((c) => {
                          const expired = c.valid_until ? new Date(c.valid_until) < new Date() : false;
                          return (
                            <tr key={c.id} className="hover:bg-gray-700/30 transition-colors">
                              <td className="px-5 py-3">
                                <code className="text-sm text-white font-mono">{c.code}</code>
                              </td>
                              <td className="px-5 py-3 text-sm text-emerald-500">
                                {c.type === 'percentage' ? `${c.value}%` : brl(c.value)}
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-400 hidden sm:table-cell">
                                {c.min_order_value > 0 ? brl(c.min_order_value) : '—'}
                              </td>
                              <td className="px-5 py-3 text-sm text-gray-300">
                                {c.usage_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}
                              </td>
                              <td className="px-5 py-3 text-xs text-gray-500 hidden md:table-cell">
                                {c.valid_until ? new Date(c.valid_until).toLocaleDateString('pt-BR') : 'sem prazo'}
                              </td>
                              <td className="px-5 py-3">
                                <span className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                                  !c.active ? 'bg-gray-600/10 text-gray-500'
                                    : expired ? 'bg-red-500/10 text-red-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                )}>
                                  {!c.active ? 'Inativo' : expired ? 'Expirado' : 'Ativo'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
