'use client';

import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, ChevronDown, RotateCcw } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

export interface FeedFilters {
  priceMin: string;
  priceMax: string;
  conditions: string[];
  sort: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  onlyFeatured: boolean;
  onlyWithVideo: boolean;
}

export const DEFAULT_FEED_FILTERS: FeedFilters = {
  priceMin: '',
  priceMax: '',
  conditions: [],
  sort: 'newest',
  onlyFeatured: false,
  onlyWithVideo: false,
};

const CONDITIONS = [
  { value: 'new', label: 'Novo' },
  { value: 'like_new', label: 'Seminovo' },
  { value: 'good', label: 'Bom estado' },
  { value: 'fair', label: 'Razoável' },
  { value: 'used', label: 'Usado' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mais recente' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
  { value: 'popular', label: 'Mais vistos' },
];

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  resultCount?: number;
}

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  resultCount,
}: FilterDrawerProps) {
  const [local, setLocal] = useState<FeedFilters>(filters);

  // Sync when drawer opens
  useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const toggleCondition = (val: string) => {
    setLocal((prev) => ({
      ...prev,
      conditions: prev.conditions.includes(val)
        ? prev.conditions.filter((c) => c !== val)
        : [...prev.conditions, val],
    }));
  };

  const reset = () => setLocal(DEFAULT_FEED_FILTERS);

  const apply = () => {
    onChange(local);
    onClose();
  };

  const hasChanges =
    local.priceMin ||
    local.priceMax ||
    local.conditions.length > 0 ||
    local.sort !== 'newest' ||
    local.onlyFeatured ||
    local.onlyWithVideo;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-brand-purple" />
            <h2 className="font-display font-bold text-lg text-gray-900">Filtros</h2>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={reset}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Fechar filtros"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Ordenação */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
              Ordenar por
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLocal((prev) => ({ ...prev, sort: opt.value as FeedFilters['sort'] }))}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    local.sort === opt.value
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-gray-200 text-gray-600 hover:border-brand-purple/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Faixa de preço */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
              Faixa de preço
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  R$
                </span>
                <input
                  type="number"
                  value={local.priceMin}
                  onChange={(e) => setLocal((prev) => ({ ...prev, priceMin: e.target.value }))}
                  placeholder="Mínimo"
                  min={0}
                  className="input-field pl-9 w-full"
                />
              </div>
              <div className="w-4 h-0.5 bg-gray-300 flex-shrink-0" />
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  R$
                </span>
                <input
                  type="number"
                  value={local.priceMax}
                  onChange={(e) => setLocal((prev) => ({ ...prev, priceMax: e.target.value }))}
                  placeholder="Máximo"
                  min={0}
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>
            {/* Quick price suggestions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: 'Até R$ 50', max: '50' },
                { label: 'Até R$ 200', max: '200' },
                { label: 'Até R$ 500', max: '500' },
                { label: 'Acima R$ 500', min: '500' },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() =>
                    setLocal((prev) => ({
                      ...prev,
                      priceMin: p.min || '',
                      priceMax: p.max || '',
                    }))
                  }
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-brand-purple/10 hover:text-brand-purple transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condição */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
              Condição
            </label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => toggleCondition(c.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    local.conditions.includes(c.value)
                      ? 'border-brand-purple bg-brand-purple text-white'
                      : 'border-gray-200 text-gray-600 hover:border-brand-purple/40'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extras */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
              Extras
            </label>
            <div className="space-y-2">
              {[
                { key: 'onlyFeatured', label: 'Apenas destaques', desc: 'Anúncios patrocinados' },
                { key: 'onlyWithVideo', label: 'Com vídeo IA', desc: 'Produtos com vídeo gerado por IA' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() =>
                    setLocal((prev) => ({
                      ...prev,
                      [opt.key]: !prev[opt.key as keyof FeedFilters],
                    }))
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                    local[opt.key as keyof FeedFilters]
                      ? 'border-brand-purple bg-brand-purple/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${local[opt.key as keyof FeedFilters] ? 'text-brand-purple' : 'text-gray-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400">{opt.desc}</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${
                      local[opt.key as keyof FeedFilters] ? 'bg-brand-purple' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        local[opt.key as keyof FeedFilters] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 pb-safe">
          <button onClick={apply} className="btn-primary w-full text-base py-3.5">
            {resultCount !== undefined
              ? `Ver ${resultCount} resultado${resultCount !== 1 ? 's' : ''}`
              : 'Aplicar filtros'}
          </button>
        </div>
      </div>
    </>
  );
}
