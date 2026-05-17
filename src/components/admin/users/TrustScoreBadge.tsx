import { getTrustScoreClass, getTrustScoreLabel, getTrustScoreBgColor, getTrustScoreTailwindColor } from '@/lib/trust-score';

interface TrustScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  showBar?: boolean;
}

export function TrustScoreBadge({ score, showLabel = true, showBar = true }: TrustScoreBadgeProps) {
  const cls = getTrustScoreClass(score);
  const label = getTrustScoreLabel(cls);
  const barColor = getTrustScoreBgColor(cls);
  const textColor = getTrustScoreTailwindColor(cls);

  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${textColor}`}>{score}</span>
        {showLabel && (
          <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
        )}
      </div>
      {showBar && (
        <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
    </div>
  );
}
