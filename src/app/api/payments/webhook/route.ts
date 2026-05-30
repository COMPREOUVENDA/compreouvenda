import { NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Log webhook
    await supabase.from('payment_webhooks').insert({
      mp_payment_id: body.data?.id?.toString(),
      event_type: body.type || body.action,
      payload: body,
    });

    // Process payment notification
    if (body.type === 'payment' || body.action === 'payment.updated') {
      const paymentId = body.data?.id?.toString();
      if (!paymentId) return NextResponse.json({ ok: true });

      const mpStatus = await getPaymentStatus(paymentId);
      
      // Update payment in database
      const { data: payment } = await supabase
        .from('payments')
        .update({ 
          mp_status: mpStatus.status, 
          mp_status_detail: mpStatus.statusDetail,
          updated_at: new Date().toISOString()
        })
        .eq('mp_payment_id', paymentId)
        .select()
        .single();

      if (payment && mpStatus.status === 'approved') {
        // Payment approved - activate escrow
        await supabase.from('escrow_transactions').insert({
          order_id: payment.order_id,
          buyer_id: payment.user_id,
          seller_id: payment.seller_id,
          amount: payment.seller_amount,
          status: 'held',
          held_at: new Date().toISOString(),
          release_scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }).select().single();

        // TODO: Send push notification to seller
        // TODO: Send email confirmation to buyer
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to MP
  }
}
