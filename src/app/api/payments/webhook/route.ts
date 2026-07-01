import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyNewOrder, notifyPaymentReceived } from '@/lib/server-notifications';

// ─── Service client sem cookie (uso em webhook, sem sessão) ───────────────
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Mapeamento status PagBank → interno ──────────────────────────────────
const STATUS_MAP: Record<string, string> = {
  AUTHORIZED:  'paid',
  PAID:        'paid',
  AVAILABLE:   'paid',
  IN_ANALYSIS: 'pending',
  WAITING:     'pending',
  DECLINED:    'cancelled',
  CANCELED:    'cancelled',
  REFUNDED:    'refunded',
};

// ─── GET — verificação de disponibilidade ────────────────────────────────
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'pagbank', version: '2.0' });
}

// ─── POST — receber notificação PagBank ──────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const contentType = request.headers.get('content-type') || '';

  let payload: any = null;

  if (contentType.includes('application/json')) {
    try { payload = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // Formato legado PagBank v1/v2 — apenas confirma recebimento
    const params = new URLSearchParams(rawBody);
    console.log('[webhook] Formato legado:', {
      notificationCode: params.get('notificationCode'),
      notificationType: params.get('notificationType'),
    });
    return NextResponse.json({ received: true, type: 'legacy' });
  } else {
    // Tenta parsear como JSON mesmo sem Content-Type correto
    try { payload = JSON.parse(rawBody); } catch {
      console.warn('[webhook] Body não reconhecido:', rawBody.slice(0, 200));
      return NextResponse.json({ received: true });
    }
  }

  if (!payload) return NextResponse.json({ received: true });

  const pagbankOrderId = payload.id;
  const referenceId    = payload.reference_id;

  console.log('[webhook] PagBank:', { pagbankOrderId, referenceId, chargeStatus: payload.charges?.[0]?.status });

  if (!referenceId && !pagbankOrderId) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  // Determinar status: preferir qualquer charge PAID/AUTHORIZED antes do primeiro
  const charges: any[] = payload.charges || [];
  const chargeStatus =
    charges.find(c => ['PAID', 'AUTHORIZED', 'AVAILABLE'].includes(c.status))?.status ||
    charges[0]?.status ||
    'WAITING';

  const internalStatus = STATUS_MAP[chargeStatus] || 'pending';
  const isPaid         = internalStatus === 'paid';
  const now            = new Date().toISOString();

  const supabase = getServiceClient();

  const updateData = {
    payment_status: chargeStatus,
    status: isPaid ? 'confirmed' : internalStatus,
    ...(pagbankOrderId ? { payment_id: pagbankOrderId } : {}),
    ...(isPaid ? { paid_at: now } : {}),
  };

  // Atualizar e retornar o pedido em uma única operação
  let order: any = null;

  if (referenceId) {
    const { data } = await supabase
      .from('orders')
      .update(updateData)
      .eq('reference_id', referenceId)
      .select('id, seller_id, buyer_id, amount, gross_value, product_id')
      .maybeSingle();
    order = data;
  }

  if (!order && pagbankOrderId) {
    const { data } = await supabase
      .from('orders')
      .update(updateData)
      .eq('payment_id', pagbankOrderId)
      .select('id, seller_id, buyer_id, amount, gross_value, product_id')
      .maybeSingle();
    order = data;
  }

  if (!order) {
    console.warn('[webhook] Pedido não encontrado — reference_id:', referenceId, 'pagbankOrderId:', pagbankOrderId);
    // Retornar 200 para evitar reenvios do PagBank
    return NextResponse.json({ received: true, warning: 'order_not_found' });
  }

  // ── Ações pós-pagamento confirmado ───────────────────────────────────
  if (isPaid) {
    const amount    = order.amount || order.gross_value || 0;
    const orderId   = order.id;
    const sellerId  = order.seller_id;
    const buyerId   = order.buyer_id;
    const productId = order.product_id;

    const [{ data: product }, { data: buyer }] = await Promise.all([
      supabase.from('products').select('title').eq('id', productId).single(),
      supabase.from('users').select('name').eq('id', buyerId).single(),
    ]);

    const productTitle = (product as any)?.title || 'Produto';
    const buyerName    = (buyer as any)?.name  || 'Comprador';

    await Promise.all([
      supabase.from('escrow_transactions').upsert(
        { order_id: orderId, amount, status: 'payment_held', held_at: now },
        { onConflict: 'order_id' }
      ),
      supabase.from('products').update({ status: 'sold' }).eq('id', productId),
      notifyNewOrder(sellerId, { orderId, productTitle, amount, buyerName })
        .catch(e => console.error('[webhook] notifyNewOrder:', e)),
      notifyPaymentReceived(sellerId, { orderId, productTitle, amount })
        .catch(e => console.error('[webhook] notifyPaymentReceived:', e)),
    ]);

    console.log('[webhook] ✅ Confirmado:', orderId, '| R$', amount);
  }

  return NextResponse.json({ received: true, status: internalStatus });
}
