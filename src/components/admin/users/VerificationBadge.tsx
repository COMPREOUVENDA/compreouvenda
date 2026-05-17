import { CheckCircle, Clock, XCircle } from 'lucide-react';

type VerificationStatus = 'approved' | 'pending' | 'rejected';

interface VerificationBadgeProps {
  status?: VerificationStatus | string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const CONFIG = {
  approved: {
    label: 'Aprovado',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  rejected: {
    label: 'Reprovado',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
  },
};

export function VerificationBadge({ status = 'pending', showIcon = true, size = 'sm' }: VerificationBadgeProps) {
  const cfg = CONFIG[status as VerificationStatus] ?? CONFIG.pending;
  const Icon = cfg.icon;
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${textSize} ${cfg.className}`}>
      {showIcon && <Icon className={iconSize} />}
      {cfg.label}
    </span>
  );
}
