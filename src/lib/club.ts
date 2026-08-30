import { randomInt } from 'crypto';

/**
 * Regras do Clube de Benefícios compartilhadas entre a vitrine do aplicativo
 * (`/api/club/*`) e a validação no balcão (`/api/partner/redemptions`).
 *
 * Estar em um único lugar não é preferência de estilo: se a vitrine dissesse
 * "disponível agora" usando um critério e o balcão recusasse usando outro, o
 * cliente chegaria à loja com um código que não funciona.
 */

export const DAY_NAMES = [
  'domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado',
] as const;

/** Fuso de referência da operação. Servidor de produção roda em UTC. */
const TZ = 'America/Sao_Paulo';

export interface BrazilNow {
  /** 0 = domingo … 6 = sábado, no horário de Brasília */
  weekday: number;
  /** 'HH:MM:SS' no horário de Brasília */
  time: string;
  /** instante absoluto (o mesmo em qualquer fuso) */
  date: Date;
}

/**
 * Dia da semana e hora corrente no horário de Brasília.
 *
 * `new Date().getDay()` devolveria o dia no fuso do servidor. Em produção isso
 * é UTC, então um benefício válido "das 08:00 às 18:00" seria recusado às 16h
 * de Brasília (19h UTC) — o cliente estaria na loja, dentro do horário, e o
 * sistema diria que não vale.
 */
export function brazilNow(reference: Date = new Date()): BrazilNow {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = fmt.formatToParts(reference);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';

  const MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // `hour` volta como '24' à meia-noite em alguns runtimes.
  const hour = get('hour') === '24' ? '00' : get('hour');

  return {
    weekday: MAP[get('weekday')] ?? reference.getUTCDay(),
    time: `${hour}:${get('minute')}:${get('second')}`,
    date: reference,
  };
}

export interface BenefitScheduleFields {
  status?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  valid_weekdays?: number[] | null;
  valid_hour_start?: string | null;
  valid_hour_end?: string | null;
  total_quantity?: number | null;
  used_quantity?: number | null;
}

export type AvailabilityCode =
  | 'available'
  | 'benefit_inactive'
  | 'not_started'
  | 'benefit_ended'
  | 'sold_out'
  | 'invalid_weekday'
  | 'invalid_hour';

export interface Availability {
  available: boolean;
  code: AvailabilityCode;
  /** Mensagem pronta para o usuário, em português. `null` quando disponível. */
  reason: string | null;
}

const OK: Availability = { available: true, code: 'available', reason: null };

/**
 * Diz se o benefício pode ser utilizado NESTE MOMENTO.
 *
 * Separa dois conceitos que a vitrine precisa distinguir:
 *   - vigência (`not_started`, `benefit_ended`, `sold_out`, `benefit_inactive`):
 *     o benefício não deve nem aparecer;
 *   - janela (`invalid_weekday`, `invalid_hour`): aparece, mas com aviso de
 *     quando vale — é informação útil, não erro.
 */
export function evaluateAvailability(
  b: BenefitScheduleFields,
  reference: Date = new Date()
): Availability {
  if (b.status && b.status !== 'approved') {
    return { available: false, code: 'benefit_inactive', reason: 'Este benefício não está ativo' };
  }

  const now = reference;

  if (b.starts_at && new Date(b.starts_at) > now) {
    return { available: false, code: 'not_started', reason: 'Este benefício ainda não começou' };
  }
  if (b.ends_at && new Date(b.ends_at) < now) {
    return { available: false, code: 'benefit_ended', reason: 'Este benefício já encerrou' };
  }
  if (b.total_quantity != null && (b.used_quantity ?? 0) >= b.total_quantity) {
    return { available: false, code: 'sold_out', reason: 'Este benefício esgotou' };
  }

  const nowBr = brazilNow(now);

  if (Array.isArray(b.valid_weekdays) && b.valid_weekdays.length > 0
    && !b.valid_weekdays.includes(nowBr.weekday)) {
    const dias = b.valid_weekdays.map((d) => DAY_NAMES[d]).filter(Boolean).join(', ');
    return {
      available: false,
      code: 'invalid_weekday',
      reason: `Válido apenas em: ${dias}`,
    };
  }

  if (b.valid_hour_start && b.valid_hour_end) {
    const inicio = b.valid_hour_start.slice(0, 8);
    const fim = b.valid_hour_end.slice(0, 8);
    if (nowBr.time < inicio || nowBr.time > fim) {
      return {
        available: false,
        code: 'invalid_hour',
        reason: `Válido das ${inicio.slice(0, 5)} às ${fim.slice(0, 5)}`,
      };
    }
  }

  return OK;
}

/** `true` quando o benefício está vigente — independente da janela do dia. */
export function isCurrentlyOffered(b: BenefitScheduleFields, reference: Date = new Date()): boolean {
  const a = evaluateAvailability(b, reference);
  return a.available || a.code === 'invalid_weekday' || a.code === 'invalid_hour';
}

/**
 * Alfabeto sem caracteres ambíguos: sem 0/O, 1/I/L, 5/S.
 * O código é ditado por telefone e digitado no balcão — legibilidade importa
 * mais do que entropia máxima. 32^8 ≈ 1,1 trilhão de combinações.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRTUVWXYZ';

/** Gera um código de resgate em maiúsculas, no formato XXXX-XXXX. */
export function generateRedemptionCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Rótulo curto da vantagem, usado nos cartões da vitrine. */
export function benefitHighlight(b: {
  benefit_type?: string | null;
  discount_percent?: number | string | null;
  discount_value?: number | string | null;
}): string {
  const pct = b.discount_percent != null ? Number(b.discount_percent) : null;
  const val = b.discount_value != null ? Number(b.discount_value) : null;
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  switch (b.benefit_type) {
    case 'percent_discount':
      return pct ? `${pct.toString().replace('.00', '')}% de desconto` : 'Desconto';
    case 'fixed_discount':
      return val ? `${brl(val)} de desconto` : 'Desconto';
    case 'cashback':
      return pct ? `${pct.toString().replace('.00', '')}% de cashback` : 'Cashback';
    case 'gift':
      return 'Brinde';
    case 'combo':
      return 'Combo especial';
    case 'free_shipping':
      return 'Frete grátis';
    default:
      return 'Vantagem exclusiva';
  }
}
