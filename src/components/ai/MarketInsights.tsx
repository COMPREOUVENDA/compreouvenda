'use client';

import { TrendingUp, Package, Clock, Flame, Snowflake, BarChart2 } from 'lucide-react';
import type { DemandLevel } from '@/lib/ai-pricing';

interface MarketInsightsData {
  avg_price: number;
  min_price: number;
  max_price: number;
  listings: number;
  sold_30d: number;
  avg_days_to_sell: number;
  demand_level: DemandLevel;
  trend: 'alta' | 'estável' | 'baixa';
}

interface MarketInsightsProps {
  data: MarketInsightsData | null;
  loading?: boolean;
}

function DemandIcon({ level }: { level: DemandLevel }) {
  if (level === 'very_high' || level === 'high') return <Flame className="w-4 h-4 text-orange-400" />;
  if (level === 'very_low' || level === 'low') return <Snowflake className="w-4 h-4 text-blue-300" />;
  return <BarChart2 className="w-4 h-4 text-gray-400" />;
}

function demandText(level: DemandLevel): string {
  switch (level) {
    case 'very_high': return 'muito alta';
    case 'high':      return 'alta';
    case 'medium':    return 'média';
    case 'low':       return 'baixa';
    case 'very_low':  return 'muito baixa';
  }
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MarketInsights({ data, loading }: MarketInsightsProps) {
  if (loading) {
    return (
      <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-700 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-700 rounded w-3/4" />
              <div className="h-2 bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const insights = [
    {
      icon: TrendingUp,
      color: 'text-brand-purple bg-brand-purple/10',
      title: `Similares: ${formatBRL(data.avg_price)} em média`,
      subtitle: `Variando de ${formatBRL(data.min_price)} a ${formatBRL(data.max_price)}`,
    },
    {
      icon: () => <DemandIcon level={data.demand_level} />,
      color: data.demand_level === 'high' || data.demand_level === 'very_high'
        ? 'text-orange-400 bg-orange-500/10'
        : 'text-gray-400 bg-gray-700/50',
      title: `Demanda ${demandText(data.demand_level)} nesta categoria`,
      subtitle: `Tendência: ${data.trend}`,
    },
    {
      icon: Package,
      color: 'text-blue-400 bg-blue-500/10',
      title: `${data.sold_30d} produtos vendidos nos últimos 30 dias`,
      subtitle: `${data.listings} anúncios ativos no total`,
    },
    {
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10',
      title: `Tempo médio de venda: ${data.avg_days_to_sell.toFixed(0)} dias`,
      subtitle: 'Com o preço certo, pode ser ainda mais rápido',
    },
  ];

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Insights de Mercado</p>
      {insights.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
            <item.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white leading-tight">{item.title}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{item.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
