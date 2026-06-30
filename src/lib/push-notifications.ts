/**
 * push-notifications.ts
 * Server-side push notification utilities for COMPREOUVENDA.COM
 * Uses web-push library for VAPID-authenticated Web Push Protocol
 */

import webpush from 'web-push';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_order'
  | 'new_message'
  | 'price_alert'
  | 'product_sold'
  | 'review_received'
  | 'payment_received'
  | 'promotion'
  | 'system';

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  type?: NotificationType;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface NotificationPreferences {
  new_order: boolean;
  new_message: boolean;
  price_alert: boolean;
  product_sold: boolean;
  review_received: boolean;
  payment_received: boolean;
  promotion: boolean;
  system: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// ── VAPID configuration ────────────────────────────────────────────────────────

function initWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contato@compreouvenda.com';

  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not configured');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

// ── Server Supabase client (service role) ─────────────────────────────────────

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}

// ── Core send function ────────────────────────────────────────────────────────

// Returns: true = sent, false = failed, 'expired' = subscription must be deleted
async function sendToSubscription(
  subscription: PushSubscriptionRow,
  notification: PushNotification
): Promise<boolean | 'expired'> {
  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/icon-192.png',
      badge: notification.badge || '/icons/icon-96.png',
      image: notification.image,
      url: notification.url || '/',
      tag: notification.tag || notification.type || 'default',
      actions: notification.actions || [
        { action: 'open', title: 'Abrir' },
        { action: 'dismiss', title: 'Fechar' },
      ],
      data: notification.data || {},
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload,
      { TTL: 86400 } // 24 hours
    );
    return true;
  } catch (err: any) {
    // 410 Gone / 404 = subscription expired — caller must remove from DB
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      console.warn('[push] Subscription expired:', subscription.endpoint.slice(0, 50));
      return 'expired';
    }
    console.error('[push] Send error:', err?.message || err);
    return false;
  }
}

// ── Check quiet hours ─────────────────────────────────────────────────────────

function isInQuietHours(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Crosses midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  notification: PushNotification
): Promise<void> {
  if (!initWebPush()) return;

  const supabase = createServiceClient();

  // Check user preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (prefs && notification.type) {
    const key = notification.type as keyof NotificationPreferences;
    if (prefs[key] === false) return; // User disabled this type
    if (isInQuietHours(prefs.quiet_hours_start, prefs.quiet_hours_end)) return;
  }

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) return;

  // Save to queue
  await supabase.from('notification_queue').insert({
    user_id: userId,
    title: notification.title,
    body: notification.body,
    icon: notification.icon,
    image: notification.image,
    url: notification.url || '/',
    type: notification.type || 'system',
    data: notification.data || {},
    status: 'pending',
  });

  // Send to all devices e coletar expiradas
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendToSubscription(sub, notification))
  );

  const expiredEndpoints: string[] = [];
  let successCount = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      if (r.value === 'expired') {
        expiredEndpoints.push(subscriptions[i].endpoint);
      } else if (r.value === true) {
        successCount++;
      }
    }
  });

  // Remover subscriptions expiradas do banco
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', expiredEndpoints);
    console.log(`[push] Removed ${expiredEndpoints.length} expired subscriptions for user ${userId}`);
  }

  const allSent = successCount > 0;

  // Update queue status
  await supabase
    .from('notification_queue')
    .update({
      status: allSent ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('title', notification.title)
    .is('sent_at', null);
}

/**
 * Send a push notification to multiple users
 */
export async function sendBulkNotification(
  userIds: string[],
  notification: PushNotification
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => sendPushNotification(userId, notification))
  );
}

// ── Domain-specific helpers ───────────────────────────────────────────────────

export async function notifyNewOrder(
  sellerId: string,
  orderData: { orderId: string; productName: string; buyerName: string; amount: number }
): Promise<void> {
  await sendPushNotification(sellerId, {
    title: 'Novo Pedido! 🛍️',
    body: `${orderData.buyerName} comprou "${orderData.productName}" por R$ ${orderData.amount.toFixed(2)}`,
    icon: '/icons/icon-192.png',
    url: `/orders/${orderData.orderId}`,
    type: 'new_order',
    tag: `order-${orderData.orderId}`,
    data: { orderId: orderData.orderId },
    actions: [
      { action: 'open', title: 'Ver Pedido' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  });
}

export async function notifyNewMessage(
  userId: string,
  messageData: { senderId: string; senderName: string; preview: string; chatId: string }
): Promise<void> {
  await sendPushNotification(userId, {
    title: `Mensagem de ${messageData.senderName}`,
    body: messageData.preview,
    icon: '/icons/icon-192.png',
    url: `/chat?id=${messageData.chatId}`,
    type: 'new_message',
    tag: `chat-${messageData.chatId}`,
    data: { chatId: messageData.chatId },
  });
}

export async function notifyProductSold(
  sellerId: string,
  productData: { productId: string; productName: string; price: number }
): Promise<void> {
  await sendPushNotification(sellerId, {
    title: 'Produto Vendido! 🎉',
    body: `"${productData.productName}" foi vendido por R$ ${productData.price.toFixed(2)}`,
    icon: '/icons/icon-192.png',
    url: `/product/${productData.productId}`,
    type: 'product_sold',
    tag: `sold-${productData.productId}`,
    data: { productId: productData.productId },
  });
}

export async function notifyPaymentReceived(
  sellerId: string,
  amount: number,
  orderId?: string
): Promise<void> {
  await sendPushNotification(sellerId, {
    title: 'Pagamento Recebido! 💰',
    body: `R$ ${amount.toFixed(2)} foi liberado para você`,
    icon: '/icons/icon-192.png',
    url: orderId ? `/orders/${orderId}` : '/dashboard',
    type: 'payment_received',
    tag: `payment-${orderId || Date.now()}`,
    data: { amount, orderId },
  });
}

export async function notifyReviewReceived(
  sellerId: string,
  reviewData: { productName: string; rating: number; reviewerName: string; productId: string }
): Promise<void> {
  const stars = '⭐'.repeat(reviewData.rating);
  await sendPushNotification(sellerId, {
    title: 'Nova Avaliação Recebida!',
    body: `${reviewData.reviewerName} avaliou "${reviewData.productName}" com ${stars}`,
    icon: '/icons/icon-192.png',
    url: `/product/${reviewData.productId}`,
    type: 'review_received',
    tag: `review-${reviewData.productId}`,
    data: { productId: reviewData.productId, rating: reviewData.rating },
  });
}
