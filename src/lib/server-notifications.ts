/**
 * server-notifications.ts
 * Helper server-side para inserir notificações na fila e disparar push.
 * Usado por API routes (orders, messages, reviews, etc).
 */

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export type NotifType =
  | 'new_order'
  | 'new_message'
  | 'product_sold'
  | 'payment_received'
  | 'review_received'
  | 'price_alert'
  | 'promotion'
  | 'system';

export interface NotifPayload {
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
  icon?: string;
}

/**
 * Insere uma notificação na fila do banco.
 * O Supabase Realtime dispara automaticamente no cliente do destinatário.
 */
export async function insertNotification(payload: NotifPayload): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('notification_queue').insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: { url: payload.url, icon: payload.icon, ...payload.data },
    status: 'sent',
  });
  if (error) console.error('[insertNotification] error:', error.message);
}

/**
 * Insere múltiplas notificações em batch.
 */
export async function insertNotifications(payloads: NotifPayload[]): Promise<void> {
  if (!payloads.length) return;
  const supabase = getServiceClient();
  const rows = payloads.map((p) => ({
    user_id: p.userId,
    type: p.type,
    title: p.title,
    body: p.body,
    data: { url: p.url, icon: p.icon, ...p.data },
    status: 'sent',
  }));
  const { error } = await supabase.from('notification_queue').insert(rows);
  if (error) console.error('[insertNotifications] error:', error.message);
}

/** Notifica o vendedor sobre um novo pedido */
export async function notifyNewOrder(
  sellerId: string,
  opts: { orderId: string; productTitle: string; amount: number; buyerName: string }
) {
  await insertNotification({
    userId: sellerId,
    type: 'new_order',
    title: 'Novo pedido recebido!',
    body: `${opts.buyerName} comprou "${opts.productTitle}" por R$ ${opts.amount.toFixed(2).replace('.', ',')}`,
    url: `/dashboard?tab=orders&orderId=${opts.orderId}`,
    data: { orderId: opts.orderId, amount: opts.amount },
    icon: '/icons/icon-192.png',
  });
}

/** Notifica o comprador sobre mudança de status do pedido */
export async function notifyOrderStatus(
  buyerId: string,
  opts: { orderId: string; productTitle: string; status: string }
) {
  const statusMessages: Record<string, { title: string; body: string }> = {
    shipped:   { title: 'Pedido enviado!',     body: `Seu pedido de "${opts.productTitle}" foi enviado. Acompanhe o rastreamento.` },
    delivered: { title: 'Pedido entregue!',    body: `"${opts.productTitle}" foi entregue com sucesso. Que tal avaliar?` },
    cancelled: { title: 'Pedido cancelado',    body: `O pedido de "${opts.productTitle}" foi cancelado.` },
    disputed:  { title: 'Disputa aberta',      body: `Uma disputa foi aberta para "${opts.productTitle}".` },
    refunded:  { title: 'Reembolso efetuado',  body: `O reembolso de "${opts.productTitle}" foi processado.` },
  };
  const msg = statusMessages[opts.status] ?? {
    title: 'Pedido atualizado',
    body: `Seu pedido de "${opts.productTitle}" foi atualizado.`,
  };
  await insertNotification({
    userId: buyerId,
    type: opts.status === 'delivered' ? 'product_sold' : opts.status === 'refunded' ? 'payment_received' : 'new_order',
    ...msg,
    url: `/orders?id=${opts.orderId}`,
    data: { orderId: opts.orderId, status: opts.status },
  });
}

/** Notifica o vendedor que recebeu pagamento */
export async function notifyPaymentReceived(
  sellerId: string,
  opts: { orderId: string; productTitle: string; amount: number }
) {
  await insertNotification({
    userId: sellerId,
    type: 'payment_received',
    title: 'Pagamento confirmado!',
    body: `Recebimento de R$ ${opts.amount.toFixed(2).replace('.', ',')} por "${opts.productTitle}" liberado na sua carteira.`,
    url: `/wallet`,
    data: { orderId: opts.orderId, amount: opts.amount },
  });
}

/** Notifica sobre nova mensagem (quando vem do servidor) */
export async function notifyNewMessage(
  recipientId: string,
  opts: { senderName: string; preview: string; conversationId: string }
) {
  await insertNotification({
    userId: recipientId,
    type: 'new_message',
    title: `Mensagem de ${opts.senderName}`,
    body: opts.preview,
    url: `/chat?id=${opts.conversationId}`,
    data: { conversationId: opts.conversationId },
  });
}

/** Notifica sobre nova avaliação recebida */
export async function notifyReviewReceived(
  sellerId: string,
  opts: { reviewerName: string; rating: number; productTitle: string }
) {
  const stars = '⭐'.repeat(opts.rating);
  await insertNotification({
    userId: sellerId,
    type: 'review_received',
    title: 'Nova avaliação recebida!',
    body: `${opts.reviewerName} avaliou "${opts.productTitle}" com ${stars} (${opts.rating}/5)`,
    url: `/profile`,
    data: { rating: opts.rating },
  });
}
