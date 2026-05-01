'use client';

import { useState } from 'react';
import {
  DollarSign, TrendingUp, ShoppingCart, Percent, Tag, Megaphone, FileBarChart,
  Settings2, ArrowUpRight, ArrowDownRight, Eye, Edit, Trash2, Plus, Search,
  Calendar, Download, Filter, ToggleLeft, ToggleRight, Crown, Sparkles,
  BadgePercent, Gift, Target, CreditCard, Users, HandHeart, Store, Layers,
  BarChart3, PieChart, Activity, Clock, CheckCircle, XCircle, Pause
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'fees', label: 'Taxas & Repasses', icon: Percent },
  { id: 'plans', label: 'Planos & Serviços', icon: Crown },
  { id: 'ads', label: 'Anúncios Patrocinados', icon: Megaphone },
  { id: 'reports', label: 'Relatórios', icon: FileBarChart },
  { id: 'coupons', label: 'Cupons & Campanhas', icon: Gift },
];

// ==================== MOCK DATA ====================

const REVENUE_STATS = [
  { label: 'Faturamento Total', value: 'R$ 487.320', change: '+18.5%', up: true, icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-400', period: 'Mês atual' },
  { label: 'Ticket Médio', value: 'R$ 342', change: '+7.2%', up: true, icon: ShoppingCart, color: 'bg-brand-blue/10 text-brand-blue', period: 'Últimos 30 dias' },
  { label: 'Conversão de Vendas', value: '4.8%', change: '+0.6%', up: true, icon: Target, color: 'bg-brand-purple/10 text-brand-purple', period: 'Vs. mês anterior' },
  { label: 'Receita Plataforma', value: 'R$ 48.732', change: '+22%', up: true, icon: Layers, color: 'bg-brand-orange/10 text-brand-orange', period: '10% das vendas' },
  { label: 'Comissões Pagas', value: 'R$ 24.366', change: '+15%', up: true, icon: Users, color: 'bg-brand-gold/10 text-brand-gold', period: '5% média' },
  { label: 'Doações Geradas', value: 'R$ 19.493', change: '+45%', up: true, icon: HandHeart, color: 'bg-emerald-500/10 text-emerald-400', period: '4% média' },
  { label: 'Anúncios Patrocinados', value: 'R$ 12.850', change: '+33%', up: true, icon: Megaphone, color: 'bg-brand-pink/10 text-brand-pink', period: '23 ativos' },
  { label: 'Planos Premium', value: 'R$ 8.940', change: '+28%', up: true, icon: Crown, color: 'bg-amber-500/10 text-amber-400', period: '298 assinantes' },
];

const DAILY_REVENUE = [
  { day: 'Seg', value: 18200, bar: 72 },
  { day: 'Ter', value: 22100, bar: 88 },
  { day: 'Qua', value: 19800, bar: 79 },
  { day: 'Qui', value: 25000, bar: 100 },
  { day: 'Sex', value: 23500, bar: 94 },
  { day: 'Sáb', value: 15600, bar: 62 },
  { day: 'Dom', value: 12300, bar: 49 },
];

const SPLIT_DISTRIBUTION = [
  { label: 'Vendedor (líquido)', percent: 78, color: 'bg-brand-orange', value: 'R$ 380.112' },
  { label: 'Plataforma (taxa)', percent: 10, color: 'bg-brand-purple', value: 'R$ 48.732' },
  { label: 'Comissões', percent: 5, color: 'bg-brand-blue', value: 'R$ 24.366' },
  { label: 'Doações', percent: 4, color: 'bg-emerald-500', value: 'R$ 19.493' },
  { label: 'Gateway', percent: 3, color: 'bg-gray-500', value: 'R$ 14.620' },
];

const FEE_CONFIG = [
  { id: 'platform', category: 'Plataforma', items: [
    { key: 'sale_fee', label: 'Taxa sobre Venda', value: 10, unit: '%', desc: 'Cobrada do vendedor em cada venda' },
    { key: 'listing_fee', label: 'Taxa de Anúncio', value: 0, unit: 'R$', desc: 'Cobrada para publicar produto (0 = grátis)' },
    { key: 'featured_fee', label: 'Destaque no Feed', value: 29.90, unit: 'R$/dia', desc: 'Produto em destaque na página inicial' },
  ]},
  { id: 'gateway', category: 'Gateway de Pagamento', items: [
    { key: 'pix_fee', label: 'Taxa PIX', value: 1.5, unit: '%', desc: 'Taxa por transação via PIX' },
    { key: 'credit_fee', label: 'Taxa Cartão Crédito', value: 3.5, unit: '%', desc: 'Taxa por transação via cartão' },
    { key: 'antecipation_fee', label: 'Antecipação', value: 2.5, unit: '%', desc: 'Taxa para antecipação de recebíveis' },
  ]},
  { id: 'commission', category: 'Comissão de Revendedor', items: [
    { key: 'commission_min', label: 'Comissão Mínima', value: 1, unit: '%', desc: 'Percentual mínimo permitido' },
    { key: 'commission_max', label: 'Comissão Máxima', value: 30, unit: '%', desc: 'Percentual máximo permitido' },
    { key: 'commission_default', label: 'Comissão Padrão', value: 5, unit: '%', desc: 'Sugestão padrão para novos produtos' },
  ]},
  { id: 'repasse', category: 'Controle de Repasses', items: [
    { key: 'seller_payout_days', label: 'Prazo Repasse Vendedor', value: 14, unit: 'dias', desc: 'Dias após confirmação de entrega' },
    { key: 'commission_payout_days', label: 'Prazo Repasse Comissionado', value: 14, unit: 'dias', desc: 'Dias após confirmação de entrega' },
    { key: 'donation_payout_days', label: 'Prazo Repasse Instituição', value: 30, unit: 'dias', desc: 'Repasse mensal para instituições' },
    { key: 'min_payout', label: 'Valor Mínimo Saque', value: 20, unit: 'R$', desc: 'Mínimo para solicitar saque' },
  ]},
];

const PLANS = [
  { id: 1, name: 'Básico', price: 'Grátis', period: '', features: ['5 anúncios/mês', '3 fotos por produto', 'Sem vídeo IA', 'Suporte por chat'], subscribers: 8420, active: true, color: 'border-gray-600' },
  { id: 2, name: 'Vendedor Pro', price: 'R$ 29,90', period: '/mês', features: ['Anúncios ilimitados', '8 fotos por produto', '5 vídeos IA/mês', 'Destaque no feed (3 dias)', 'Suporte prioritário'], subscribers: 214, active: true, color: 'border-brand-purple' },
  { id: 3, name: 'Loja Premium', price: 'R$ 79,90', period: '/mês', features: ['Tudo do Pro', 'Vídeos IA ilimitados', 'Destaque permanente', 'Página de loja personalizada', 'Analytics avançado', 'Selo verificado'], subscribers: 84, active: true, color: 'border-brand-gold' },
  { id: 4, name: 'Institucional', price: 'R$ 49,90', period: '/mês', features: ['Para instituições beneficentes', 'Selo de instituição verificada', 'Página institucional', 'Relatório de doações', 'Campanha de arrecadação'], subscribers: 12, active: true, color: 'border-emerald-500' },
];

const ADS = [
  { id: 1, product: 'iPhone 14 Pro Max', seller: 'Maria Santos', type: 'Feed Destaque', budget: 'R$ 150', spent: 'R$ 87,50', impressions: '12.4K', clicks: 598, ctr: '4.8%', status: 'active', daysLeft: 5 },
  { id: 2, product: 'MacBook Air M2', seller: 'Lucas Ferreira', type: 'Banner Topo', budget: 'R$ 300', spent: 'R$ 210', impressions: '28.1K', clicks: 1120, ctr: '3.9%', status: 'active', daysLeft: 3 },
  { id: 3, product: 'PS5 Digital', seller: 'Pedro Costa', type: 'Feed Destaque', budget: 'R$ 100', spent: 'R$ 100', impressions: '8.9K', clicks: 445, ctr: '5.0%', status: 'completed', daysLeft: 0 },
  { id: 4, product: 'Sofá Retrátil', seller: 'João Silva', type: 'Categoria Destaque', budget: 'R$ 80', spent: 'R$ 32', impressions: '4.2K', clicks: 168, ctr: '4.0%', status: 'paused', daysLeft: 8 },
  { id: 5, product: 'Bicicleta Speed', seller: 'Ana Oliveira', type: 'Feed Destaque', budget: 'R$ 200', spent: 'R$ 0', impressions: '0', clicks: 0, ctr: '0%', status: 'pending', daysLeft: 10 },
];

const COUPONS = [
  { id: 1, code: 'BEMVINDO10', type: 'Percentual', value: '10%', minOrder: 'R$ 50', maxDiscount: 'R$ 100', uses: 342, limit: 1000, expires: '30/06/2026', status: 'active' },
  { id: 2, code: 'FRETE50', type: 'Valor fixo', value: 'R$ 50', minOrder: 'R$ 200', maxDiscount: '-', uses: 87, limit: 200, expires: '15/05/2026', status: 'active' },
  { id: 3, code: 'FLASH20', type: 'Percentual', value: '20%', minOrder: 'R$ 100', maxDiscount: 'R$ 200', uses: 500, limit: 500, expires: '10/04/2026', status: 'expired' },
  { id: 4, code: 'DOE5', type: 'Percentual', value: '5%', minOrder: 'R$ 0', maxDiscount: 'R$ 50', uses: 0, limit: 100, expires: '31/12/2026', status: 'scheduled' },
];

const REPORT_DATA = {
  daily: [
    { date: '26/04', vendas: 156, receita: 'R$ 53.400', plataforma: 'R$ 5.340', comissoes: 'R$ 2.670', doacoes: 'R$ 2.136' },
    { date: '25/04', vendas: 142, receita: 'R$ 48.600', plataforma: 'R$ 4.860', comissoes: 'R$ 2.430', doacoes: 'R$ 1.944' },
    { date: '24/04', vendas: 168, receita: 'R$ 57.500', plataforma: 'R$ 5.750', comissoes: 'R$ 2.875', doacoes: 'R$ 2.300' },
    { date: '23/04', vendas: 131, receita: 'R$ 44.800', plataforma: 'R$ 4.480', comissoes: 'R$ 2.240', doacoes: 'R$ 1.792' },
    { date: '22/04', vendas: 149, receita: 'R$ 51.000', plataforma: 'R$ 5.100', comissoes: 'R$ 2.550', doacoes: 'R$ 2.040' },
  ],
  weekly: [
    { date: 'Sem 17', vendas: 1042, receita: 'R$ 356.800', plataforma: 'R$ 35.680', comissoes: 'R$ 17.840', doacoes: 'R$ 14.272' },
    { date: 'Sem 16', vendas: 987, receita: 'R$ 337.900', plataforma: 'R$ 33.790', comissoes: 'R$ 16.895', doacoes: 'R$ 13.516' },
    { date: 'Sem 15', vendas: 1105, receita: 'R$ 378.300', plataforma: 'R$ 37.830', comissoes: 'R$ 18.915', doacoes: 'R$ 15.132' },
    { date: 'Sem 14', vendas: 923, receita: 'R$ 316.100', plataforma: 'R$ 31.610', comissoes: 'R$ 15.805', doacoes: 'R$ 12.644' },
  ],
  monthly: [
    { date: 'Abr/26', vendas: 4230, receita: 'R$ 487.320', plataforma: 'R$ 48.732', comissoes: 'R$ 24.366', doacoes: 'R$ 19.493' },
    { date: 'Mar/26', vendas: 3856, receita: 'R$ 421.600', plataforma: 'R$ 42.160', comissoes: 'R$ 21.080', doacoes: 'R$ 16.864' },
    { date: 'Fev/26', vendas: 3412, receita: 'R$ 389.200', plataforma: 'R$ 38.920', comissoes: 'R$ 19.460', doacoes: 'R$ 15.568' },
    { date: 'Jan/26', vendas: 2987, receita: 'R$ 342.100', plataforma: 'R$ 34.210', comissoes: 'R$ 17.105', doacoes: 'R$ 13.684' },
  ],
};

const adStatusMap: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
  paused: { label: 'Pausado', color: 'bg-amber-500/10 text-amber-400', icon: Pause },
  completed: { label: 'Concluído', color: 'bg-brand-blue/10 text-brand-blue', icon: CheckCircle },
  pending: { label: 'Aguardando', color: 'bg-gray-500/10 text-gray-400', icon: Clock },
};

const couponStatusMap: Record<string, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-400' },
  expired: { label: 'Expirado', color: 'bg-red-500/10 text-red-400' },
  scheduled: { label: 'Agendado', color: 'bg-brand-blue/10 text-brand-blue' },
  paused: { label: 'Pausado', color: 'bg-amber-500/10 text-amber-400' },
};

// ==================== COMPONENT ====================

export default function AdminCommercialPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Comercial & Monetização</h1>
          <p className="text-sm text-gray-500 mt-1">Gestão completa de receitas, taxas, planos e campanhas</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <Activity className="w-3 h-3" /> Tempo real
          </span>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-700">
            <Download className="w-3.5 h-3.5" /> Exportar
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

      {/* ==================== DASHBOARD TAB ==================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Revenue Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {REVENUE_STATS.map((stat) => (
              <div key={stat.label} className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className={cn('text-[10px] font-bold flex items-center gap-0.5', stat.up ? 'text-emerald-400' : 'text-red-400')}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </span>
                </div>
                <span className="font-display font-bold text-xl text-white block">{stat.value}</span>
                <span className="text-[10px] text-gray-500">{stat.label}</span>
                <span className="block text-[9px] text-gray-600 mt-0.5">{stat.period}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart (visual bars) */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
              <h3 className="font-display font-semibold text-white mb-4">Receita Diária (Semana Atual)</h3>
              <div className="flex items-end gap-3 h-40">
                {DAILY_REVENUE.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-500">R$ {(d.value / 1000).toFixed(1)}K</span>
                    <div className="w-full rounded-t-lg bg-brand-purple/20 relative" style={{ height: `${d.bar}%` }}>
                      <div className="absolute inset-0 rounded-t-lg bg-gradient-to-t from-brand-purple to-brand-blue opacity-80" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Distribution */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
              <h3 className="font-display font-semibold text-white mb-4">Distribuição do Split</h3>
              {/* Visual bar */}
              <div className="flex rounded-full h-4 overflow-hidden mb-4">
                {SPLIT_DISTRIBUTION.map((s) => (
                  <div key={s.label} className={cn('h-full', s.color)} style={{ width: `${s.percent}%` }} />
                ))}
              </div>
              <div className="space-y-2.5">
                {SPLIT_DISTRIBUTION.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', s.color)} />
                      <span className="text-sm text-gray-300">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{s.percent}%</span>
                      <span className="text-sm text-white font-display font-semibold w-28 text-right">{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Converters */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
            <h3 className="font-display font-semibold text-white mb-4">Funil de Conversão</h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                { stage: 'Visitantes', value: '89.2K', color: 'bg-gray-700', width: '100%' },
                { stage: 'Visualizaram Produto', value: '34.1K', color: 'bg-brand-blue/30', width: '82%' },
                { stage: 'Adicionaram ao Chat', value: '12.4K', color: 'bg-brand-purple/30', width: '58%' },
                { stage: 'Iniciaram Checkout', value: '6.8K', color: 'bg-brand-orange/30', width: '38%' },
                { stage: 'Compraram', value: '4.2K', color: 'bg-emerald-500/30', width: '22%' },
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

      {/* ==================== FEES TAB ==================== */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {FEE_CONFIG.map((group) => (
            <div key={group.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-gray-400" /> {group.category}
              </h3>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-2 border-b border-gray-700/50 last:border-0">
                    <div className="flex-1">
                      <span className="text-sm text-gray-200 font-medium">{item.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{item.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={item.value}
                        step={item.unit === '%' ? 0.5 : 1}
                        className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
                      />
                      <span className="text-xs text-gray-500 w-12">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button className="w-full bg-brand-purple text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-purple/90 transition-colors">
            <CheckCircle className="w-4 h-4" /> Salvar Configurações de Taxas
          </button>
        </div>
      )}

      {/* ==================== PLANS TAB ==================== */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Gerencie os planos e serviços pagos da plataforma</p>
            <button className="flex items-center gap-1.5 bg-brand-purple text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-purple/90">
              <Plus className="w-4 h-4" /> Novo Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <div key={plan.id} className={cn('bg-gray-800 rounded-2xl border-2 p-6 relative', plan.color)}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-display font-bold text-2xl text-white">{plan.price}</span>
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-gray-700 rounded-lg"><Edit className="w-4 h-4 text-gray-400" /></button>
                    <button className="p-1.5 hover:bg-gray-700 rounded-lg">
                      {plan.active ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-gray-600" />}
                    </button>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{plan.subscribers.toLocaleString('pt-BR')} assinantes</span>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', plan.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-600/10 text-gray-500')}>
                    {plan.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== ADS TAB ==================== */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          {/* Ads Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Receita de Anúncios', value: 'R$ 12.850', change: '+33%' },
              { label: 'Anúncios Ativos', value: '23', change: '+5' },
              { label: 'Impressões Totais', value: '53.6K', change: '+18%' },
              { label: 'CTR Médio', value: '4.4%', change: '+0.3%' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <span className="font-display font-bold text-xl text-white">{s.value}</span>
                <span className="block text-xs text-gray-500">{s.label}</span>
                <span className="text-[10px] text-emerald-400">{s.change}</span>
              </div>
            ))}
          </div>

          {/* Ads Table */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Anúncios Patrocinados</h3>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-600">
                  <Filter className="w-3 h-3" /> Filtrar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {['Produto', 'Tipo', 'Orçamento', 'Gasto', 'Impressões', 'Cliques', 'CTR', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="text-left text-[10px] text-gray-500 font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {ADS.map((ad) => {
                    const st = adStatusMap[ad.status];
                    return (
                      <tr key={ad.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3">
                          <span className="text-sm text-white font-medium">{ad.product}</span>
                          <span className="block text-[10px] text-gray-500">{ad.seller}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{ad.type}</td>
                        <td className="px-4 py-3 text-sm text-white font-display">{ad.budget}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{ad.spent}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{ad.impressions}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{ad.clicks}</td>
                        <td className="px-4 py-3 text-sm text-brand-blue font-semibold">{ad.ctr}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1', st.color)}>
                            <st.icon className="w-3 h-3" /> {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button className="p-1 hover:bg-gray-600 rounded"><Eye className="w-3.5 h-3.5 text-gray-400" /></button>
                            <button className="p-1 hover:bg-gray-600 rounded"><Edit className="w-3.5 h-3.5 text-gray-400" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REPORTS TAB ==================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    reportPeriod === p ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  )}
                >
                  {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : 'Mensal'}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl hover:bg-gray-700">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>

          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="font-display font-semibold text-white">
                Relatório Financeiro — {reportPeriod === 'daily' ? 'Diário' : reportPeriod === 'weekly' ? 'Semanal' : 'Mensal'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {['Período', 'Vendas', 'Receita Bruta', 'Plataforma', 'Comissões', 'Doações'].map((h) => (
                      <th key={h} className="text-left text-[10px] text-gray-500 font-medium px-5 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {REPORT_DATA[reportPeriod].map((r, i) => (
                    <tr key={i} className="hover:bg-gray-700/30">
                      <td className="px-5 py-3 text-sm text-white font-medium">{r.date}</td>
                      <td className="px-5 py-3 text-sm text-gray-300">{r.vendas.toLocaleString('pt-BR')}</td>
                      <td className="px-5 py-3 text-sm text-white font-display font-semibold">{r.receita}</td>
                      <td className="px-5 py-3 text-sm text-brand-purple">{r.plataforma}</td>
                      <td className="px-5 py-3 text-sm text-brand-blue">{r.comissoes}</td>
                      <td className="px-5 py-3 text-sm text-emerald-400">{r.doacoes}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-600 bg-gray-700/30">
                    <td className="px-5 py-3 text-sm text-white font-bold">Total</td>
                    <td className="px-5 py-3 text-sm text-white font-bold">
                      {REPORT_DATA[reportPeriod].reduce((s, r) => s + r.vendas, 0).toLocaleString('pt-BR')}
                    </td>
                    <td colSpan={4} className="px-5 py-3 text-sm text-gray-400">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Receita Líquida Plataforma', value: 'R$ 48.732', color: 'text-brand-purple' },
              { label: 'Comissões Distribuídas', value: 'R$ 24.366', color: 'text-brand-blue' },
              { label: 'Doações Repassadas', value: 'R$ 19.493', color: 'text-emerald-400' },
              { label: 'Gateway (custo)', value: 'R$ 14.620', color: 'text-gray-400' },
            ].map((c) => (
              <div key={c.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <span className={cn('font-display font-bold text-xl', c.color)}>{c.value}</span>
                <span className="block text-[10px] text-gray-500 mt-1">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== COUPONS TAB ==================== */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Gerencie cupons de desconto e campanhas promocionais</p>
            <button className="flex items-center gap-1.5 bg-brand-purple text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-purple/90">
              <Plus className="w-4 h-4" /> Novo Cupom
            </button>
          </div>

          {/* Coupons Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Cupons Ativos', value: '2', color: 'text-emerald-400' },
              { label: 'Usos Totais', value: '929', color: 'text-brand-blue' },
              { label: 'Desconto Total Dado', value: 'R$ 18.740', color: 'text-brand-orange' },
              { label: 'Vendas via Cupom', value: 'R$ 124.500', color: 'text-brand-purple' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <span className={cn('font-display font-bold text-xl', s.color)}>{s.value}</span>
                <span className="block text-xs text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Coupons Table */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {['Código', 'Tipo', 'Valor', 'Pedido Mín.', 'Desc. Máx.', 'Usos', 'Expira', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="text-left text-[10px] text-gray-500 font-medium px-4 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {COUPONS.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <span className="text-sm text-white font-mono font-bold bg-gray-700 px-2 py-0.5 rounded">{c.code}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{c.type}</td>
                      <td className="px-4 py-3 text-sm text-white font-display font-semibold">{c.value}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{c.minOrder}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{c.maxDiscount}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.uses}/{c.limit}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{c.expires}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', couponStatusMap[c.status]?.color)}>
                          {couponStatusMap[c.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="p-1 hover:bg-gray-600 rounded"><Edit className="w-3.5 h-3.5 text-gray-400" /></button>
                          <button className="p-1 hover:bg-gray-600 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaign Section */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-gold" /> Campanhas Promocionais
              </h3>
              <button className="flex items-center gap-1.5 text-xs bg-brand-gold/10 text-brand-gold px-3 py-1.5 rounded-lg hover:bg-brand-gold/20">
                <Plus className="w-3 h-3" /> Nova Campanha
              </button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Dia das Mães 2026', period: '01/05 - 12/05', discount: 'Até 30% off', status: 'Agendada', statusColor: 'text-brand-blue bg-brand-blue/10', products: 45 },
                { name: 'Semana do Consumidor', period: '15/03 - 22/03', discount: 'Até 50% off', status: 'Encerrada', statusColor: 'text-gray-400 bg-gray-700', products: 128 },
              ].map((camp, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-700/30 rounded-xl">
                  <div>
                    <span className="text-sm text-white font-semibold">{camp.name}</span>
                    <span className="block text-xs text-gray-500">{camp.period} · {camp.products} produtos · {camp.discount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', camp.statusColor)}>{camp.status}</span>
                    <button className="p-1 hover:bg-gray-600 rounded"><Edit className="w-3.5 h-3.5 text-gray-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
