import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { notifyNewOrder, notifyPaymentReceived } from '@/lib/server-notifications';
import { cleanEnv } from '@/lib/env';

// ─── Service client sem cookie (uso em webhook, sem sessão) ───────────────
function getServiceClient() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
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
  DECLINED:    'failed',
  CANCELED:    'cancelled',
  REFUNDED:    'refunded',
};

/**
 * Verifica o header `x-authenticity-token` enviado pelo PagBank.
 * O hash é SHA-256 sobre a concatenação do token com o corpo bruto.
 * Aceita as duas ordens documentadas pelo PagBank para maior compatibilidade.
 * Se `PAGBANK_WEBHOOK_TOKEN` não estiver configurado, a verificação é pulada
 * (permite operar em sandbox sem bloquear o fluxo).
 */
function verifySignature(rawBody: string, headerToken: string | null): { ok: boolean; skipped: boolean } {
  const secret = cleanEnv(process.env.PAGBANK_WEBHOOK_TOKEN) || cleanEnv(process.env.PAGBANK_TOKEN);
  if (!secret) return { ok: true, skipped: true };
  if (!headerToken) return { ok: false, skipped: false };

  const candidates = [
    crypto.createHash('sha256').update(`${secret}-${rawBody}`).digest('hex'),
    crypto.createHash('sha256').update(`${rawBody}-${secret}`).digest('hex'),
  ];

  const received = headerToken.trim().toLowerCase();
  const ok = candidates.some((expected) => {
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  });

  return { ok, skipped: false };
}

// ─── GET — verificação de disponibilidade ────────────────────────────────
export async function GET() {
  return NextResponse.json({ status: 'active', provider: 'pagbank', version: '2.1' });
}

// ─── POST — receber notificação PagBank ──────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const contentType = request.headers.get('content-type') || '';

  // Verificação de autenticidade antes de qualquer efeito colateral
  const sig = verifySignature(rawBody, request.headers.get('x-authenticity-token'));
  if (!sig.ok) {
    console.warn('[webhook] Assinatura inválida — requisição rejeitada');
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
  }
  if (sig.skipped) {
    console.warn('[webhook] PAGBANK_WEBHOOK_TOKEN não configurado — verificação de assinatura pulada');
  }

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
    try { payload = JSON.parse(rawBody); } catch {
      console.warn('[webhook] Body não reconhecido:', rawBody.slice(0, 200));
      return NextResponse.json({ received: true });
    }
  }

  if (!payload) return NextResponse.json({ received: true });

  const pagbankOrderId = payload.id;
  const referenceId    = payload.reference_id;

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

  console.log('[webhook] PagBank:', { pagbankOrderId, referenceId, chargeStatus, internalStatus });

  const supabase = getServiceClient();

  // Registrar o evento bruto para auditoria/reprocessamento
  await supabase.from('payment_webhooks').insert({
    provider_payment_id: pagbankOrderId ?? null,
    event_type: chargeStatus,
    payload,
    processed: false,
  }).then(
    () => undefined,
    (e: any) => console.warn('[webhook] falha ao registrar evento:', e?.message)
  );

  // Colunas conforme o schema real de public.orders
  const updateData: Record<string, unknown> = {
    payment_status: internalStatus,
    ...(pagbankOrderId ? { payment_id: pagbankOrderId } : {}),
    ...(charges[0]?.id ? { transaction_id: charges[0].id } : {}),
    ...(isPaid ? { paid_at: now, escrow_status: 'held' } : {}),
    ...(internalStatus === 'refunded' ? { refunded_at: now, escrow_status: 'refunded' } : {}),
  };

  const selectCols = 'id, seller_id, buyer_id, gross_value, product_id, payment_status';

  let order: any = null;

  if (referenceId) {
    const { data } = await supabase
      .from('orders')
      .update(updateData)
      .eq('reference_id', referenceId)
      .select(selectCols)
      .maybeSingle();
    order = data;
  }

  if (!order && pagbankOrderId) {
    const { data } = await supabase
      .from('orders')
      .update(updateData)
      .eq('payment_id', pagbankOrderId)
      .select(selectCols)
      .maybeSingle();
    order = data;
  }

  if (!order) {
    console.warn('[webhook] Pedido não encontrado — reference_id:', referenceId, 'pagbankOrderId:', pagbankOrderId);
    // Retornar 200 para evitar reenvios infinitos do PagBank
    return NextResponse.json({ received: true, warning: 'order_not_found' });
  }

  // ── Ações pós-pagamento confirmado ───────────────────────────────────
  if (isPaid) {
    const amount    = Number(order.gross_value) || 0;
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
      ).then(() => undefined, (e: any) => console.error('[webhook] escrow:', e?.message)),
      supabase.from('products').update({ status: 'sold' }).eq('id', productId)
        .then(() => undefined, (e: any) => console.error('[webhook] product sold:', e?.message)),
      notifyNewOrder(sellerId, { orderId, productTitle, amount, buyerName })
        .catch(e => console.error('[webhook] notifyNewOrder:', e)),
      notifyPaymentReceived(sellerId, { orderId, productTitle, amount })
        .catch(e => console.error('[webhook] notifyPaymentReceived:', e)),
    ]);

    console.log('[webhook] Confirmado:', orderId, '| R$', amount);
  }

  return NextResponse.json({ received: true, status: internalStatus });
}
