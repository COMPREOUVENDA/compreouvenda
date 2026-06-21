'use client';

/**
 * src/lib/payments.ts
 * Utilitários de pagamento para uso no lado do cliente.
 *
 * `calculateSplit`  — cálculo puro das taxas (sem I/O)
 * `createPayment`   — chama POST /api/payments/create e devolve resultado tipado
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SplitOptions {
  platformFeePercent: number;  // ex: 10
  gatewayFeePercent: number;   // ex: 1.5 (PIX) ou 3.5 (cartão)
  commissionPercent?: number;  // ex: 5 (revendedor)
  donationPercent?: number;    // ex: 2 (solidário)
}

export interface SplitResult {
  platformFee: number;
  gatewayFee: number;
  commissionFee: number;
  commissionAmount: number;   // alias de commissionFee
  donationFee: number;
  donationAmount: number;     // alias de donationFee
  sellerAmount: number;
}

export interface CardData {
  number: string;
  holder?: string;
  holderName?: string;
  expiry?: string;
  expMonth?: string;
  expYear?: string;
  cvv: string;
  cpf?: string;
}

export interface CreatePaymentParams {
  orderId: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  method: 'pix' | 'credit';
  totalAmount: number;
  installments?: number;
  split: SplitResult & { sellerId: string; totalAmount: number };
  card?: CardData;
}

export interface PaymentResult {
  success: boolean;
  status: 'pending' | 'approved' | 'failed';
  orderId?: string;
  pagbankOrderId?: string;
  transactionId?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  pixExpiresAt?: string;
  errorMessage?: string;
}

// ─── calculateSplit ───────────────────────────────────────────────────────────

/**
 * Calcula a divisão de valores a partir do preço bruto.
 * Todos os valores são em BRL (não centavos).
 */
export function calculateSplit(
  grossAmount: number,
  options: SplitOptions
): SplitResult {
  const platformFee   = +(grossAmount * (options.platformFeePercent / 100)).toFixed(2);
  const gatewayFee    = +(grossAmount * (options.gatewayFeePercent / 100)).toFixed(2);
  const commissionFee = +(grossAmount * ((options.commissionPercent ?? 0) / 100)).toFixed(2);
  const donationFee   = +(grossAmount * ((options.donationPercent ?? 0) / 100)).toFixed(2);
  const sellerAmount  = +(grossAmount - platformFee - gatewayFee - commissionFee - donationFee).toFixed(2);

  return {
    platformFee,
    gatewayFee,
    commissionFee,
    commissionAmount: commissionFee,
    donationFee,
    donationAmount: donationFee,
    sellerAmount,
  };
}

// ─── createPayment ────────────────────────────────────────────────────────────

/**
 * Envia os dados de pagamento para a API route e retorna o resultado.
 * Deve ser chamada somente em client components (usa fetch).
 */
export async function createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const res = await fetch('/api/payments/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId:       params.productId,
      amount:          params.totalAmount,
      paymentMethod:   params.method,
      cardData:        params.card,
      sellerId:        params.sellerId,
      installments:    params.installments ?? 1,
      // passa split para o backend usar no split de pagamento PagBank
      splitPlatformFee:   params.split.platformFee,
      splitGatewayFee:    params.split.gatewayFee,
      splitSellerAmount:  params.split.sellerAmount,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      status: 'failed',
      errorMessage: data?.error || `Erro ${res.status}`,
    };
  }

  // Normaliza a resposta da rota /api/payments/create
  const isPix = params.method === 'pix';
  const hasPix = !!(data.pixData?.qrCode || data.pixData?.copyPaste);

  return {
    success:       data.success ?? true,
    status:        hasPix ? 'pending' : 'approved',
    orderId:       data.orderId,
    pagbankOrderId: data.pagbankOrderId,
    transactionId: data.pagbankOrderId || data.orderId,
    pixQrCode:     data.pixData?.qrCode,
    pixCopyPaste:  data.pixData?.copyPaste,
    pixExpiresAt:  data.pixData?.expiresAt,
    errorMessage:  data.error,
  };
}
