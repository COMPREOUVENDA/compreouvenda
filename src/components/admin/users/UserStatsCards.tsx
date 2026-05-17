import { Users, CheckCircle, Clock, XCircle, Star, AlertTriangle } from 'lucide-react';
import type { UserStats } from '@/hooks/useUserManagement';

interface UserStatsCardsProps {
  stats: UserStats;
  loading?: boolean;
}

interface CardDef {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

export function UserStatsCards({ stats, loading }: UserStatsCardsProps) {
  const cards: CardDef[] = [
    {
      label: 'Total de Usuários',
      value: stats.total,
      icon: <Users className="w-5 h-5" />,
      color: 'text-brand-purple bg-brand-purple/10',
    },
    {
      label: 'Aprovados',
      value: stats.approved,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-emerald-400 bg-emerald-500/10',
    },
    {
      label: 'Pendentes',
      value: stats.pending,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-amber-400 bg-amber-500/10',
    },
    {
      label: 'Reprovados',
      value: stats.rejected,
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-red-400 bg-red-500/10',
    },
    {
      label: 'Score Médio',
      value: stats.avg_trust_score,
      icon: <Star className="w-5 h-5" />,
      color: 'text-blue-400 bg-blue-500/10',
    },
    {
      label: 'Alertas',
      value: stats.alerts,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-orange-400 bg-orange-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-gray-800 rounded-2xl border border-gray-700 p-4 flex flex-col gap-2"
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
            {card.icon}
          </div>
          <div>
            {loading ? (
              <div className="h-7 w-12 bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-white">{card.value}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
