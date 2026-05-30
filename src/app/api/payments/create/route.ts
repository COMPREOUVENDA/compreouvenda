import { NextResponse } from 'next/server';
import { createPixPayment, createCardPayment, calculateSplit } from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { orderId, sellerId, amount, description, method, cardToken, installments, payerCpf } = body;

    if (!sellerId || !amount || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { platformFee, sellerAmount } = calculateSplit(amount, 10);

    const input = {
      orderId: orderId || crypto.randomUUID(),
      buyerId: user.id,
      sellerId,
      amount,
      platformFeePercent: 10,
      description: description || 'Compra no CompreOuVenda',
      method,
      cardToken,
      installments,
      payerEmail: user.email || '',
      payerName: user.user_metadata?.name,
      payerCpf,
    };

    let result;
    if (method === 'pix') {
      result = await createPixPayment(input);
    } else {
      result = await createCardPayment(input);
    }

    // Save payment to database
    await supabase.from('payments').insert({
      order_id: input.orderId,
      user_id: user.id,
      seller_id: sellerId,
      amount,
      platform_fee: platformFee,
      seller_amount: sellerAmount,
      method,
      mp_payment_id: result.id,
      mp_status: result.status,
      mp_status_detail: result.statusDetail,
      pix_qr_code: result.pixQrCode,
      pix_qr_base64: result.pixQrBase64,
      pix_expiration: result.pixExpiration,
      installments: installments || 1,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: error.message || 'Payment failed' }, { status: 500 });
  }
}
