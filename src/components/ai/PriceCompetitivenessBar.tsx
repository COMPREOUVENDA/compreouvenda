'use client';

import type { MarketPosition } from '@/lib/ai-pricing';

interface PriceCompetitivenessBarProps {
  currentPrice: number;
  minMarket: number;
  avgMarket: number;
  maxMarket: number;
  position: MarketPosition;
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const SEGMENTS = [
  { label: 'Excelente', color: 'bg-emerald-500', width: '25%' },
  { label: 'Competitivo', color: 'bg-blue-500', width: '25%' },
  { label: 'Acima', color: 'bg-amber-500', width: '25%' },
  { label: 'Muito acima', color: 'bg-red-500', width: '25%' },
];

function getIndicatorPosition(price: number, min: number, max: number): string {
  if (max <= min) return '50%';
  const pct = Math.min(100, Math.max(0, ((price - min) / (max - min)) * 100));
  return `${pct}%`;
}

export default function PriceCompetitivenessBar({
  currentPrice,
  minMarket,
  avgMarket,
  maxMarket,
  position,
}: PriceCompetitivenessBarProps) {
  const indicatorLeft = getIndicatorPosition(currentPrice, minMarket, maxMarket * 1.3);

  const positionLabels: Record<MarketPosition, { text: string; color: string }> = {
    excellent:   { text: 'Excelente - você vai vender rápido!', color: 'text-emerald-400' },
    competitive: { text: 'Competitivo - bom equilíbrio', color: 'text-blue-400' },
    high:        { text: 'Acima da média - pode demorar mais', color: 'text-amber-400' },
    very_high:   { text: 'Muito acima - difícil de vender', color: 'text-red-400' },
  };

  const label = positionLabels[position];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Seu preço vs mercado</span>
        <span className={`text-xs font-semibold ${label.color}`}>{label.text}</span>
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full overflow-hidden flex">
        {SEGMENTS.map((s) => (
          <div key={s.label} className={`${s.color} opacity-70`} style={{ width: s.width }} />
        ))}
        {/* Indicator arrow */}
        <div
          className="absolute top-0 bottom-0 flex items-center pointer-events-none"
          style={{ left: `calc(${indicatorLeft} - 6px)` }}
        >
          <div className="w-3 h-5 flex flex-col items-center -mt-1">
            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-white" />
            <div className="w-0.5 flex-1 bg-white" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[9px] text-gray-500">
        <span>{formatBRL(minMarket)}</span>
        <span>{formatBRL(avgMarket)} (média)</span>
        <span>{formatBRL(maxMarket)}</span>
      </div>
    </div>
  );
}
