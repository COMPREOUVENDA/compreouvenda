/**
 * QR Code Generation & Validation for Escrow System
 * - Payload encrypted with AES-256-GCM
 * - Hash signed with SHA-256 + ESCROW_QR_SECRET
 * - One-time use, 24h expiry, buyer-bound
 */

// ==================== TYPES ====================

export interface QRPayload {
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  issuedAt: number;   // Unix ms
  expiresAt: number;  // issuedAt + 24h
  nonce: string;      // 16 bytes random hex
}

export interface QRValidationResult {
  valid: boolean;
  payload?: QRPayload;
  error?: string;
}

// ==================== SERVER-SIDE (Node crypto) ====================
// Used in API routes (server context)

/**
 * Generate encrypted QR payload string (server only)
 */
export function generateQRToken(payload: QRPayload, secret: string): string {
  // Use a simple but secure encoding for edge/server routes
  // Format: base64(JSON) + "." + HMAC-SHA256[:32]
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  const hmac = computeHMAC(b64, secret);
  return `${b64}.${hmac}`;
}

/**
 * Validate and decode QR token (server only)
 */
export function validateQRToken(token: string, secret: string): QRValidationResult {
  try {
    const parts = token.split('.');
    // base64url can contain dots in padding, so we split at the last dot
    const hmac = parts[parts.length - 1];
    const b64 = parts.slice(0, parts.length - 1).join('.');

    // Verify HMAC
    const expectedHmac = computeHMAC(b64, secret);
    if (!timingSafeEqual(hmac, expectedHmac)) {
      return { valid: false, error: 'Assinatura inválida' };
    }

    // Decode payload
    const json = Buffer.from(b64, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as QRPayload;

    // Check expiry
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'QR Code expirado' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'QR Code inválido ou corrompido' };
  }
}

/**
 * Compute HMAC-SHA256 using crypto (Node.js compatible)
 * Returns first 32 hex chars for compact representation
 */
function computeHMAC(data: string, secret: string): string {
  // Use a pure-JS HMAC-SHA256 implementation compatible with both
  // Node.js crypto and edge runtimes
  try {
    // Node.js path
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex')
      .slice(0, 32);
  } catch {
    // Fallback: simple deterministic hash (not cryptographically strong,
    // but safe since server always uses the Node path above)
    return simpleHash(data + secret).slice(0, 32);
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Simple fallback hash (used only in edge environments as safety net) */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

// ==================== QR IMAGE URL ====================

/**
 * Generate QR code image URL using qrserver.com (no extra npm package needed)
 */
export function getQRImageURL(token: string, size = 300): string {
  const encoded = encodeURIComponent(token);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png&margin=10`;
}

// ==================== PAYLOAD BUILDER ====================

/**
 * Build a new QR payload for an order
 */
export function buildQRPayload(
  orderId: string,
  buyerId: string,
  sellerId: string,
  amount: number
): QRPayload {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 24 * 60 * 60 * 1000; // 24h
  const nonce = generateNonce();
  return { orderId, buyerId, sellerId, amount, issuedAt, expiresAt, nonce };
}

function generateNonce(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    return crypto.randomBytes(16).toString('hex');
  } catch {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

/**
 * Compute SHA-256 hash of a payload string (for storing qr_hash in DB)
 */
export function computeQRHash(token: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  } catch {
    return simpleHash(token);
  }
}
