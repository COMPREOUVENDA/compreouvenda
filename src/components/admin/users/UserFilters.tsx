import { X } from 'lucide-react';
import type { UserFilters } from '@/hooks/useUserManagement';

interface UserFiltersProps {
  filters: UserFilters;
  onChange: (f: Partial<UserFilters>) => void;
  onReset: () => void;
}

export function UserFiltersPanel({ filters, onChange, onReset }: UserFiltersProps) {
  const hasActiveFilters =
    filters.verification_status !== 'all' ||
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.is_pro !== 'all' ||
    filters.score_min > 0 ||
    filters.score_max < 100 ||
    filters.date_from !== '' ||
    filters.date_to !== '';

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Verification Status */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Verificação
          </label>
          <select
            value={filters.verification_status}
            onChange={(e) => onChange({ verification_status: e.target.value as UserFilters['verification_status'] })}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="all">Todos</option>
            <option value="approved">Aprovado</option>
            <option value="pending">Pendente</option>
            <option value="rejected">Reprovado</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Tipo
          </label>
          <select
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value as UserFilters['type'] })}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="all">Todos</option>
            <option value="buyer">Compradores</option>
            <option value="seller">Vendedores</option>
            <option value="charity">Instituições</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as UserFilters['status'] })}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="verified">Verificado</option>
            <option value="suspended">Suspenso</option>
            <option value="blocked">Bloqueado</option>
            <option value="pending_deletion">Ag. Exclusão</option>
          </select>
        </div>

        {/* Is Pro */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Plano
          </label>
          <select
            value={filters.is_pro}
            onChange={(e) => onChange({ is_pro: e.target.value as UserFilters['is_pro'] })}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          >
            <option value="all">Todos</option>
            <option value="true">PRO</option>
            <option value="false">Gratuito</option>
          </select>
        </div>

        {/* Date from */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Cadastro de
          </label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ date_from: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>

        {/* Date to */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Cadastro até
          </label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => onChange({ date_to: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>
      </div>

      {/* Score range */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
          Score: {filters.score_min} – {filters.score_max}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={filters.score_min}
          onChange={(e) => onChange({ score_min: parseInt(e.target.value) })}
          className="flex-1 accent-brand-purple"
        />
        <input
          type="range"
          min={0}
          max={100}
          value={filters.score_max}
          onChange={(e) => onChange({ score_max: parseInt(e.target.value) })}
          className="flex-1 accent-brand-purple"
        />
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-700 rounded-lg"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
