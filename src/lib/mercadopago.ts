import MercadoPagoConfig, { Payment, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' 
});

const payment = new Payment(client);

export interface CreatePaymentInput {
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  platformFeePercent?: number; // default 10%
  description: string;
  method: 'pix' | 'credit_card' | 'debit_card';
  cardToken?: string;
  installments?: number;
  payerEmail: string;
  payerName?: string;
  payerCpf?: string;
}

export interface PaymentResult {
  id: string;
  status: string;
  statusDetail?: string;
  pixQrCode?: string;
  pixQrBase64?: string;
  pixExpiration?: string;
  platformFee: number;
  sellerAmount: number;
}

export async function createPixPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  const platformFee = input.amount * ((input.platformFeePercent || 10) / 100);
  const sellerAmount = input.amount - platformFee;

  const result = await payment.create({
    body: {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix',
      payer: {
        email: input.payerEmail,
        first_name: input.payerName || '',
        identification: input.payerCpf ? { type: 'CPF', number: input.payerCpf } : undefined,
      },
      metadata: {
        order_id: input.orderId,
        buyer_id: input.buyerId,
        seller_id: input.sellerId,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
      },
    },
  });

  return {
    id: String(result.id),
    status: result.status || 'pending',
    statusDetail: result.status_detail || undefined,
    pixQrCode: (result as any).point_of_interaction?.transaction_data?.qr_code,
    pixQrBase64: (result as any).point_of_interaction?.transaction_data?.qr_code_base64,
    pixExpiration: (result as any).date_of_expiration,
    platformFee,
    sellerAmount,
  };
}

export async function createCardPayment(input: CreatePaymentInput): Promise<PaymentResult> {
  const platformFee = input.amount * ((input.platformFeePercent || 10) / 100);
  const sellerAmount = input.amount - platformFee;

  const result = await payment.create({
    body: {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'credit_card',
      token: input.cardToken,
      installments: input.installments || 1,
      payer: {
        email: input.payerEmail,
        first_name: input.payerName || '',
        identification: input.payerCpf ? { type: 'CPF', number: input.payerCpf } : undefined,
      },
      metadata: {
        order_id: input.orderId,
        buyer_id: input.buyerId,
        seller_id: input.sellerId,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
      },
    },
  });

  return {
    id: String(result.id),
    status: result.status || 'pending',
    statusDetail: result.status_detail || undefined,
    platformFee,
    sellerAmount,
  };
}

export async function getPaymentStatus(paymentId: string) {
  const result = await payment.get({ id: paymentId });
  return {
    id: String(result.id),
    status: result.status,
    statusDetail: result.status_detail,
    amount: result.transaction_amount,
    method: result.payment_method_id,
    metadata: result.metadata,
  };
}

export async function refundPayment(paymentId: string) {
  const result = await payment.refund({ id: paymentId });
  return { id: String(result.id), status: result.status };
}

export function calculateSplit(amount: number, feePercent: number = 10) {
  const platformFee = Math.round(amount * (feePercent / 100) * 100) / 100;
  const sellerAmount = Math.round((amount - platformFee) * 100) / 100;
  return { platformFee, sellerAmount };
}
