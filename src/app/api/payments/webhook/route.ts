import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyNewOrder, notifyPaymentReceived } from '@/lib/server-notifications';

// PagBank envia webhooks (notifications) para este endpoint
export async function POST(request: Request) {
  const body = await request.json();

  console.log('PagBank Webhook received:', JSON.stringify(body, null, 2));

  const supabase = createClient();

  // PagBank envia notificações com estrutura:
  // { id, reference_id, charges: [{ id, status, ... }] }
  const { id: orderId, reference_id, charges } = body;

  if (!reference_id && !orderId) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }

  const chargeStatus = charges?.[0]?.status;

  // Mapear status PagBank → status interno
  const statusMap: Record<string, string> = {
    AUTHORIZED: 'paid',
    PAID:       'paid',
    AVAILABLE:  'paid',
    IN_ANALYSIS: 'pending',
    DECLINED:   'cancelled',
    CANCELED:   'cancelled',
    WAITING:    'pending',
  };

  const internalStatus = statusMap[chargeStatus] || 'pending';

  // Atualizar pedido pelo reference_id ou payment_id
  const query = reference_id
    ? supabase.from('orders').update({
        status: internalStatus,
        payment_status: chargeStatus,
        paid_at: internalStatus === 'paid' ? new Date().toISOString() : null,
      }).eq('reference_id', reference_id)
    : supabase.from('orders').update({
        status: internalStatus,
        payment_status: chargeStatus,
        paid_at: internalStatus === 'paid' ? new Date().toISOString() : null,
      }).eq('payment_id', orderId);

  const { error } = await query;
  if (error) console.error('Webhook DB Error:', error);

  // Se pagamento confirmado: escrow + notificações
  if (internalStatus === 'paid') {
    const { data: order } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id, amount, gross_value, product_id, payment_method')
      .or(`reference_id.eq.${reference_id},payment_id.eq.${orderId}`)
      .single();

    if (order) {
      const amount = (order as any).amount || (order as any).gross_value || 0;
      const productId = (order as any).product_id;
      const sellerId = (order as any).seller_id;
      const buyerId = (order as any).buyer_id;

      // Buscar dados do produto e comprador para notificações
      const [{ data: product }, { data: buyer }] = await Promise.all([
        supabase.from('products').select('title').eq('id', productId).single(),
        supabase.from('users').select('name').eq('id', buyerId).single(),
      ]);

      const productTitle = (product as any)?.title || 'Produto';
      const buyerName = (buyer as any)?.name || 'Comprador';

      // Criar/atualizar registro de escrow
      await supabase.from('escrow_transactions').upsert(
        {
          order_id: (order as any).id,
          amount,
          status: 'payment_held',
          held_at: new Date().toISOString(),
        },
        { onConflict: 'order_id' }
      );

      // Marcar produto como vendido
      await supabase.from('products').update({ status: 'sold' }).eq('id', productId);

      // Notificar vendedor: nova venda confirmada + pagamento recebido
      await Promise.all([
        notifyNewOrder(sellerId, {
          orderId: (order as any).id,
          productTitle,
          amount,
          buyerName,
        }),
        notifyPaymentReceived(sellerId, {
          orderId: (order as any).id,
          productTitle,
          amount,
        }),
      ]).catch((e) => console.error('Webhook notification error:', e));
    }
  }

  return NextResponse.json({ received: true });
}

// PagBank pode enviar GET para verificar se o endpoint existe
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'pagbank' });
}
