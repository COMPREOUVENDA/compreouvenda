/**
 * src/lib/rate-limit.ts
 * Limitador de requisições em memória para rotas de API do Next.js.
 * Usa janela deslizante por IP. Reinicia ao reiniciar o servidor.
 */

interface EntradaRateLimit {
  contagem: number;
  resetEm: number;
}

// Armazenamento global (vive no escopo do módulo Node.js entre requisições)
const armazenamento = new Map<string, EntradaRateLimit>();

// Limpeza de entradas antigas a cada 10 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const agora = Date.now();
    armazenamento.forEach((entrada, chave) => {
      if (entrada.resetEm < agora) armazenamento.delete(chave);
    });
  }, 10 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Máximo de requisições permitidas na janela */
  limit: number;
  /** Duração da janela em segundos */
  windowSec: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Verifica e incrementa o limite de requisições para uma chave (geralmente IP + rota).
 * Retorna { success: false } quando o limite é excedido.
 */
export function rateLimit(chave: string, config: RateLimitConfig): RateLimitResult {
  const agora = Date.now();
  const janelaMs = config.windowSec * 1000;

  let entrada = armazenamento.get(chave);

  if (!entrada || entrada.resetEm < agora) {
    entrada = { contagem: 1, resetEm: agora + janelaMs };
    armazenamento.set(chave, entrada);
    return { success: true, remaining: config.limit - 1, resetAt: entrada.resetEm };
  }

  entrada.contagem += 1;

  if (entrada.contagem > config.limit) {
    return { success: false, remaining: 0, resetAt: entrada.resetEm };
  }

  return {
    success: true,
    remaining: config.limit - entrada.contagem,
    resetAt: entrada.resetEm,
  };
}

/**
 * Extrai o melhor IP disponível de uma requisição Next.js.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'desconhecido'
  );
}
