export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m de você`;
  return `${km.toFixed(1)}km de você`;
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return then.toLocaleDateString('pt-BR');
}

export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export const conditionLabels: Record<string, string> = {
  new: 'Novo',
  like_new: 'Seminovo',
  good: 'Bom estado',
  fair: 'Razoável',
  used: 'Usado',
};
