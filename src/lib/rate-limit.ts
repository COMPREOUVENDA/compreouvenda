/**
 * src/lib/rate-limit.ts
 * In-memory rate limiter for Next.js API routes.
 * Uses a sliding window per IP. Resets on server restart (edge-compatible).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Global store (lives in Node.js module scope across requests)
const store = new Map<string, RateLimitEntry>();

// Cleanup entries older than 5 minutes every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt < now) store.delete(key);
    });
  }, 10 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a given key (usually IP + route).
 * Returns { success: false } when the limit is exceeded.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;

  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { success: true, remaining: config.limit - 1, resetAt: entry.resetAt };
  }

  entry.count += 1;

  if (entry.count > config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Extract the best available IP from a Next.js request.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
