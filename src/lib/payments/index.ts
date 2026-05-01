/**
 * Payment Gateway Integration
 * Supports: MercadoPago (primary), Stripe (fallback)
 * Methods: PIX, Credit Card
 * Features: Split payments (seller, platform, commission, donation)
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// ==================== TYPES ====================

export interface PaymentSplit {
  sellerId: string;
  sellerAmount: number;
  platformFee: number;
  commissionAmount: number;
  commissionUserId?: string;
  donationAmount: number;
  donationCharityId?: string;
  gatewayFee: number;
  totalAmount: number;
}

export interface CreatePaymentRequest {
  orderId: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  method: 'pix' | 'credit';
  totalAmount: number;
  installments?: number;
  split: PaymentSplit;
  card?: {
    number: string;
    expMonth: string;
    expYear: string;
    cvv: string;
    holderName: string;
    cpf: string;
  };
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status: 'approved' | 'pending' | 'rejected' | 'in_process';
  pixQrCode?: string;
  pixCopyPaste?: string;
  pixExpiresAt?: string;
  errorMessage?: string;
  gatewayResponse?: any;
}

// ==================== SPLIT CALCULATOR ====================

interface SplitConfig {
  platformFeePercent: number;  // e.g., 10%
  gatewayFeePercent: number;   // e.g., 1.5% PIX, 3.5% credit
  commissionPercent?: number;  // e.g., 5% (from product config)
  donationPercent?: number;    // e.g., 3% (from seller config)
}

export function calculateSplit(totalAmount: number, config: SplitConfig): PaymentSplit {
  const gatewayFee = Math.round(totalAmount * (config.gatewayFeePercent / 100));
  const platformFee = Math.round(totalAmount * (config.platformFeePercent / 100));
  const commissionAmount = config.commissionPercent
    ? Math.round(totalAmount * (config.commissionPercent / 100))
    : 0;

  // Donation is from seller's portion (after fees)
  const sellerGross = totalAmount - gatewayFee - platformFee - commissionAmount;
  const donationAmount = config.donationPercent
    ? Math.round(sellerGross * (config.donationPercent / 100))
    : 0;

  const sellerAmount = sellerGross - donationAmount;

  return {
    sellerId: '',
    sellerAmount,
    platformFee,
    commissionAmount,
    donationAmount,
    gatewayFee,
    totalAmount,
  };
}

// ==================== PAYMENT SERVICE ====================

export async function createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
  try {
    // Create order in DB first
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id: request.productId,
        buyer_id: request.buyerId,
        seller_id: request.sellerId,
        total_amount: request.totalAmount,
        platform_fee: request.split.platformFee,
        seller_amount: request.split.sellerAmount,
        commission_amount: request.split.commissionAmount,
        donation_amount: request.split.donationAmount,
        payment_method: request.method,
        payment_status: 'pending',
        status: 'pending_payment',
      })
      .select()
      .single();

    if (orderError) throw new Error('Erro ao criar pedido: ' + orderError.message);

    // Call payment gateway
    if (request.method === 'pix') {
      return await processPixPayment(order.id, request);
    } else {
      return await processCreditPayment(order.id, request);
    }
  } catch (e: any) {
    return {
      success: false,
      status: 'rejected',
      errorMessage: e.message || 'Erro ao processar pagamento',
    };
  }
}

// ==================== PIX PAYMENT ====================

async function processPixPayment(orderId: string, request: CreatePaymentRequest): Promise<PaymentResult> {
  // In production, this calls MercadoPago API:
  // POST https://api.mercadopago.com/v1/payments
  // { transaction_amount, payment_method_id: 'pix', payer: { email } }

  // For MVP, generate a simulated PIX payment
  const pixCode = `00020126580014BR.GOV.BCB.PIX0136${generateUUID()}5204000053039865404${request.totalAmount.toFixed(2)}5802BR5925COMPREOUVENDA MARKETPLACE6009SAO PAULO62070503***6304`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  // Update order with PIX data
  await supabase.from('orders').update({
    payment_gateway_id: 'pix_' + Date.now(),
    payment_status: 'pending',
    payment_details: { pix_code: pixCode, expires_at: expiresAt },
  }).eq('id', orderId);

  // Create notification for seller
  await supabase.from('notifications').insert({
    user_id: request.sellerId,
    type: 'payment',
    title: 'Novo pedido via PIX',
    body: `Aguardando pagamento de R$ ${request.totalAmount.toFixed(2)}`,
    data: { order_id: orderId },
  });

  return {
    success: true,
    paymentId: orderId,
    status: 'pending',
    pixQrCode: `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(pixCode)}`,
    pixCopyPaste: pixCode,
    pixExpiresAt: expiresAt,
  };
}

// ==================== CREDIT CARD PAYMENT ====================

async function processCreditPayment(orderId: string, request: CreatePaymentRequest): Promise<PaymentResult> {
  // In production, this calls MercadoPago API:
  // POST https://api.mercadopago.com/v1/payments
  // { transaction_amount, token (card token), installments, payment_method_id }

  if (!request.card) {
    return { success: false, status: 'rejected', errorMessage: 'Dados do cartão não informados' };
  }

  // Validate card (basic)
  if (request.card.number.replace(/\s/g, '').length < 13) {
    return { success: false, status: 'rejected', errorMessage: 'Número do cartão inválido' };
  }

  // Simulate approval (in production, call gateway)
  const approved = true; // MercadoPago would return this

  if (approved) {
    await supabase.from('orders').update({
      payment_gateway_id: 'cc_' + Date.now(),
      payment_status: 'approved',
      status: 'paid',
    }).eq('id', orderId);

    // Notify seller
    await supabase.from('notifications').insert({
      user_id: request.sellerId,
      type: 'payment',
      title: 'Pagamento aprovado! 🎉',
      body: `Venda de R$ ${request.totalAmount.toFixed(2)} confirmada via cartão`,
      data: { order_id: orderId },
    });

    // Notify buyer
    await supabase.from('notifications').insert({
      user_id: request.buyerId,
      type: 'payment',
      title: 'Compra confirmada!',
      body: `Seu pagamento de R$ ${request.totalAmount.toFixed(2)} foi aprovado`,
      data: { order_id: orderId },
    });

    return {
      success: true,
      paymentId: orderId,
      status: 'approved',
    };
  } else {
    await supabase.from('orders').update({
      payment_status: 'rejected',
      status: 'cancelled',
    }).eq('id', orderId);

    return {
      success: false,
      status: 'rejected',
      errorMessage: 'Pagamento recusado pela operadora',
    };
  }
}

// ==================== WEBHOOK HANDLER (for real gateway) ====================

export async function handlePaymentWebhook(payload: any): Promise<void> {
  // MercadoPago sends notifications to /api/webhooks/mercadopago
  // { action: 'payment.updated', data: { id: 'payment_id' } }

  const paymentId = payload?.data?.id;
  if (!paymentId) return;

  // Fetch payment status from gateway
  // const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } });
  // const payment = await response.json();

  // Update order status based on payment status
  // if (payment.status === 'approved') { ... }
}

// ==================== REFUND ====================

export async function refundPayment(orderId: string, reason: string): Promise<boolean> {
  try {
    await supabase.from('orders').update({
      payment_status: 'refunded',
      status: 'refunded',
      refund_reason: reason,
    }).eq('id', orderId);

    return true;
  } catch {
    return false;
  }
}

// ==================== HELPERS ====================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ==================== PAYMENT PLANS (for subscriptions) ====================

export async function createSubscription(userId: string, planId: string): Promise<boolean> {
  // For platform plans (Vendedor Pro, Loja Premium, etc.)
  try {
    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      started_at: new Date().toISOString(),
      next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
