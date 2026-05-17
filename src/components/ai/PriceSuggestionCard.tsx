'use client';

import { useState } from 'react';
import {
  Sparkles, TrendingUp, Zap, DollarSign, Clock, Flame, Snowflake,
  ChevronDown, ChevronUp, CheckCircle, Loader2, BarChart2,
} from 'lucide-react';
import type { PriceSuggestion, MarketPosition, DemandLevel } from '@/lib/ai-pricing';

// ============================================================
// HELPERS
// ============================================================

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function positionColor(pos: MarketPosition): string {
  switch (pos) {
    case 'excellent':  return 'text-emerald-400';
    case 'competitive': return 'text-blue-400';
    case 'high':       return 'text-amber-400';
    case 'very_high':  return 'text-red-400';
  }
}

function positionBg(pos: MarketPosition): string {
  switch (pos) {
    case 'excellent':  return 'bg-emerald-500/20 border-emerald-500/40';
    case 'competitive': return 'bg-blue-500/20 border-blue-500/40';
    case 'high':       return 'bg-amber-500/20 border-amber-500/40';
    case 'very_high':  return 'bg-red-500/20 border-red-500/40';
  }
}

function positionLabel(pos: MarketPosition): string {
  switch (pos) {
    case 'excellent':  return 'Excelente';
    case 'competitive': return 'Competitivo';
    case 'high':       return 'Acima';
    case 'very_high':  return 'Muito acima';
  }
}

function positionBarWidth(pos: MarketPosition): string {
  switch (pos) {
    case 'excellent':  return 'w-[20%] bg-emerald-500';
    case 'competitive': return 'w-[45%] bg-blue-500';
    case 'high':       return 'w-[70%] bg-amber-500';
    case 'very_high':  return 'w-[95%] bg-red-500';
  }
}

function DemandIcon({ level }: { level: DemandLevel }) {
  if (level === 'very_high' || level === 'high') return <Flame className="w-4 h-4 text-orange-400" />;
  if (level === 'very_low' || level === 'low') return <Snowflake className="w-4 h-4 text-blue-300" />;
  return <BarChart2 className="w-4 h-4 text-gray-400" />;
}

function demandLabel(level: DemandLevel): string {
  switch (level) {
    case 'very_high': return 'Muito alta';
    case 'high':      return 'Alta';
    case 'medium':    return 'Média';
    case 'low':       return 'Baixa';
    case 'very_low':  return 'Muito baixa';
  }
}

// ============================================================
// SKELETON LOADER
// ============================================================
function PriceSuggestionSkeleton() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 animate-pulse space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gray-700 rounded-lg" />
        <div className="h-4 bg-gray-700 rounded w-32" />
        <div className="ml-auto flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 text-brand-purple animate-spin" />
          <span className="text-xs text-gray-400">Analisando mercado...</span>
        </div>
      </div>
      <div className="h-12 bg-gray-700 rounded-xl w-3/4 mx-auto" />
      <div className="h-3 bg-gray-700 rounded w-full" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-gray-700 rounded-xl" />
        <div className="h-16 bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
interface PriceSuggestionCardProps {
  suggestion: PriceSuggestion | null;
  loading?: boolean;
  onUsePrice?: (price: number) => void;
}

export default function PriceSuggestionCard({
  suggestion,
  loading = false,
  onUsePrice,
}: PriceSuggestionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <PriceSuggestionSkeleton />;
  if (!suggestion) return null;

  const {
    suggested_price,
    min_price,
    max_price,
    quick_sale_price,
    max_profit_price,
    confidence_score,
    market_position,
    estimated_days_to_sell,
    demand_level,
    ai_model,
    reasoning,
    similar_count,
    market_avg,
  } = suggestion;

  const isAI = ai_model !== 'internal_v1';
  const range = max_price - min_price || 1;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-gray-700">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-purple to-brand-orange flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white">Sugestão de Preço</span>
        <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isAI
            ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple'
            : 'bg-gray-700 border-gray-600 text-gray-300'
        }`}>
          {isAI ? 'IA' : 'Análise de Mercado'}
        </span>
        {/* Confidence */}
        <span className="ml-auto text-[10px] text-gray-400 font-medium">
          {confidence_score}% confiança
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Main price */}
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Preço recomendado</p>
          <p className="text-4xl font-extrabold bg-gradient-to-r from-brand-purple to-brand-orange bg-clip-text text-transparent">
            {formatBRL(suggested_price)}
          </p>
          {market_avg && (
            <p className="text-xs text-gray-400 mt-1">Média do mercado: {formatBRL(market_avg)}</p>
          )}
        </div>

        {/* Price range slider visual */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{formatBRL(min_price)}</span>
            <span className="text-gray-500">Faixa sugerida</span>
            <span>{formatBRL(max_price)}</span>
          </div>
          <div className="relative h-2 bg-gray-700 rounded-full">
            {/* Fill */}
            <div
              className="absolute h-full bg-gradient-to-r from-brand-purple/60 to-brand-orange/60 rounded-full"
              style={{ left: 0, right: 0 }}
            />
            {/* Indicator */}
            <div
              className="absolute w-4 h-4 -top-1 rounded-full bg-white border-2 border-brand-purple shadow-md"
              style={{
                left: `calc(${Math.min(100, Math.max(0, ((suggested_price - min_price) / range) * 100))}% - 8px)`,
              }}
            />
          </div>
        </div>

        {/* Badges: quick sale + max profit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Venda Rápida</span>
            </div>
            <p className="text-sm font-bold text-white">{formatBRL(quick_sale_price)}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Maior Lucro</span>
            </div>
            <p className="text-sm font-bold text-white">{formatBRL(max_profit_price)}</p>
          </div>
        </div>

        {/* Market position bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Posição no mercado</span>
            <span className={`text-xs font-bold ${positionColor(market_position)}`}>
              {positionLabel(market_position)}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${positionBarWidth(market_position)}`} />
          </div>
          <div className="flex justify-between text-[9px] text-gray-500 mt-1">
            <span>Excelente</span>
            <span>Competitivo</span>
            <span>Alto</span>
            <span>Muito alto</span>
          </div>
        </div>

        {/* Sale estimate + demand */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${positionBg(market_position)}`}>
          <Clock className={`w-4 h-4 flex-shrink-0 ${positionColor(market_position)}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white leading-tight">
              Alta chance de vender em {estimated_days_to_sell} dia{estimated_days_to_sell !== 1 ? 's' : ''}
            </p>
            {similar_count !== undefined && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Baseado em {similar_count} produtos similares
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <DemandIcon level={demand_level} />
            <span className="text-[10px] text-gray-300 font-medium">{demandLabel(demand_level)}</span>
          </div>
        </div>

        {/* Expandable reasoning */}
        {reasoning && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-200 transition-colors py-1"
          >
            <span>Ver análise detalhada</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
        {expanded && reasoning && (
          <div className="bg-gray-700/50 rounded-xl p-3">
            <p className="text-xs text-gray-300 leading-relaxed">{reasoning}</p>
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onUsePrice?.(suggested_price)}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-purple to-brand-orange text-white text-sm font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            <CheckCircle className="w-4 h-4" />
            Usar este preço
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-xl transition-colors"
          >
            <DollarSign className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
