export type TrustScoreClass = 'excellent' | 'good' | 'regular' | 'low' | 'critical';

export interface TrustScoreInput {
  email_verified?: boolean;
  phone_verified?: boolean;
  kyc_status?: string;
  selfie_url?: string;
  city?: string;
  state?: string;
  created_at?: string;
  reports_count?: number;
  completed_transactions?: number;
}

export interface TrustScoreResult {
  score: number;
  class: TrustScoreClass;
  label: string;
  color: string;
  breakdown: TrustScoreBreakdown[];
}

export interface TrustScoreBreakdown {
  criterion: string;
  points: number;
  earned: boolean;
}

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  const breakdown: TrustScoreBreakdown[] = [];
  let score = 0;

  // Email verificado (+10)
  const emailVerified = !!input.email_verified;
  breakdown.push({ criterion: 'Email verificado', points: 10, earned: emailVerified });
  if (emailVerified) score += 10;

  // Telefone verificado (+10)
  const phoneVerified = !!input.phone_verified;
  breakdown.push({ criterion: 'Telefone verificado', points: 10, earned: phoneVerified });
  if (phoneVerified) score += 10;

  // Documento aprovado (+20)
  const documentApproved = input.kyc_status === 'approved';
  breakdown.push({ criterion: 'Documento aprovado', points: 20, earned: documentApproved });
  if (documentApproved) score += 20;

  // Selfie aprovada (+15)
  const selfieApproved = !!input.selfie_url && input.kyc_status === 'approved';
  breakdown.push({ criterion: 'Selfie aprovada', points: 15, earned: selfieApproved });
  if (selfieApproved) score += 15;

  // Endereço validado (+10)
  const addressValidated = !!(input.city && input.state);
  breakdown.push({ criterion: 'Endereço validado', points: 10, earned: addressValidated });
  if (addressValidated) score += 10;

  // Tempo na plataforma (+5/mês, max 15)
  let platformPoints = 0;
  if (input.created_at) {
    const createdDate = new Date(input.created_at);
    const now = new Date();
    const monthsDiff = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    platformPoints = Math.min(monthsDiff * 5, 15);
  }
  breakdown.push({ criterion: 'Tempo na plataforma', points: 15, earned: platformPoints > 0 });
  score += platformPoints;

  // Sem denúncias (+10)
  const noReports = (input.reports_count ?? 0) === 0;
  breakdown.push({ criterion: 'Sem denúncias', points: 10, earned: noReports });
  if (noReports) score += 10;

  // Transações concluídas (+5 por transação, max 10)
  const transactionPoints = Math.min((input.completed_transactions ?? 0) * 5, 10);
  breakdown.push({
    criterion: 'Transações concluídas',
    points: 10,
    earned: transactionPoints > 0,
  });
  score += transactionPoints;

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  const cls = getTrustScoreClass(score);

  return {
    score,
    class: cls,
    label: getTrustScoreLabel(cls),
    color: getTrustScoreColor(cls),
    breakdown,
  };
}

export function getTrustScoreClass(score: number): TrustScoreClass {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'regular';
  if (score >= 20) return 'low';
  return 'critical';
}

export function getTrustScoreLabel(cls: TrustScoreClass): string {
  const labels: Record<TrustScoreClass, string> = {
    excellent: 'Excelente',
    good: 'Bom',
    regular: 'Regular',
    low: 'Baixo',
    critical: 'Crítico',
  };
  return labels[cls];
}

export function getTrustScoreColor(cls: TrustScoreClass): string {
  const colors: Record<TrustScoreClass, string> = {
    excellent: '#10b981', // emerald-500
    good: '#3b82f6',     // blue-500
    regular: '#f59e0b',  // amber-500
    low: '#f97316',      // orange-500
    critical: '#ef4444', // red-500
  };
  return colors[cls];
}

export function getTrustScoreTailwindColor(cls: TrustScoreClass): string {
  const colors: Record<TrustScoreClass, string> = {
    excellent: 'text-emerald-400',
    good: 'text-blue-400',
    regular: 'text-amber-400',
    low: 'text-orange-400',
    critical: 'text-red-400',
  };
  return colors[cls];
}

export function getTrustScoreBgColor(cls: TrustScoreClass): string {
  const colors: Record<TrustScoreClass, string> = {
    excellent: 'bg-emerald-500',
    good: 'bg-blue-500',
    regular: 'bg-amber-500',
    low: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return colors[cls];
}
