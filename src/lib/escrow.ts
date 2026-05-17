/**
 * Escrow System - Core Business Logic
 * CompreOuVenda Marketplace
 *
 * Flow: pending_payment → payment_held → shipped → delivered_pending_confirmation → confirmed → payment_released
 * Alternate: delivered_pending_confirmation → disputed → (admin resolves)
 * Auto-release: 7 days after delivered_at if buyer doesn't confirm
 */

import { createClient as createServerSupabase } from '@/lib/supabase/server';
import {
  buildQRPayload,
  generateQRToken,
  validateQRToken,
  computeQRHash,
  getQRImageURL,
} from '@/lib/qrcode';

// ==================== TYPES ====================

export type EscrowStatus =
  | 'pending_payment'
  | 'payment_held'
  | 'shipped'
  | 'delivered_pending_confirmation'
  | 'confirmed'
  | 'payment_released'
  | 'disputed'
  | 'cancelled';

export interface EscrowTransaction {
  id: string;
  order_id: string;
  amount: number;
  status: EscrowStatus;
  held_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  confirmed_at: string | null;
  released_at: string | null;
  auto_release_at: string | null;
  qr_hash: string | null;
  qr_payload_encrypted: string | null;
  qr_expires_at: string | null;
  qr_used: boolean;
  reminder_48h_sent: boolean;
  reminder_24h_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface EscrowActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

// ==================== HELPERS ====================

function getQRSecret(): string {
  const secret = process.env.ESCROW_QR_SECRET;
  if (!secret) throw new Error('ESCROW_QR_SECRET not configured');
  return secret;
}

async function logEscrowAction(
  supabase: ReturnType<typeof createServerSupabase>,
  transactionId: string,
  action: string,
  actorId: string | null,
  actorType: 'buyer' | 'seller' | 'admin' | 'system',
  oldStatus: string | null,
  newStatus: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await supabase.from('escrow_logs').insert({
    transaction_id: transactionId,
    action,
    actor_id: actorId,
    actor_type: actorType,
    old_status: oldStatus,
    new_status: newStatus,
    details: details ?? null,
    ip_address: ipAddress ?? null,
  });
}

async function sendEscrowNotification(
  supabase: ReturnType<typeof createServerSupabase>,
  userId: string,
  type: string,
  title: string,
  body: string,
  orderId: string
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data: { order_id: orderId },
  });
}

// ==================== CREATE ESCROW ====================

/**
 * Called when payment is confirmed by the gateway.
 * Creates the escrow transaction and holds the funds.
 */
export async function createEscrowTransaction(
  orderId: string,
  amount: number,
  buyerId: string,
  sellerId: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  // Check if escrow already exists
  const { data: existing } = await supabase
    .from('escrow_transactions')
    .select('id')
    .eq('order_id', orderId)
    .single();

  if (existing) {
    return { success: false, error: 'Escrow já existe para este pedido' };
  }

  const { data: escrow, error } = await supabase
    .from('escrow_transactions')
    .insert({
      order_id: orderId,
      amount,
      status: 'payment_held',
      held_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Erro ao criar escrow: ' + error.message };
  }

  // Update order escrow_status
  await supabase
    .from('orders')
    .update({ escrow_status: 'payment_held', payment_status: 'held' })
    .eq('id', orderId);

  await logEscrowAction(supabase, escrow.id, 'payment_held', null, 'system', 'pending_payment', 'payment_held');

  // Notify buyer and seller
  const { data: order } = await supabase
    .from('orders')
    .select('buyer_id, seller_id, gross_value')
    .eq('id', orderId)
    .single();

  if (order) {
    await sendEscrowNotification(
      supabase, order.buyer_id, 'escrow_payment_held',
      'Pagamento recebido e protegido',
      `Seu pagamento de R$ ${amount.toFixed(2)} está seguro no escrow. Aguardando envio.`,
      orderId
    );
    await sendEscrowNotification(
      supabase, order.seller_id, 'escrow_payment_held',
      'Pagamento retido — envie o produto',
      `Pagamento de R$ ${amount.toFixed(2)} retido. Envie o produto para liberar.`,
      orderId
    );
  }

  return { success: true, data: { escrowId: escrow.id } };
}

// ==================== MARK AS SHIPPED ====================

export async function markAsShipped(
  orderId: string,
  sellerId: string,
  trackingCode?: string,
  carrier?: string,
  ipAddress?: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  const { data: escrow, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error || !escrow) return { success: false, error: 'Escrow não encontrado' };
  if (escrow.status !== 'payment_held') {
    return { success: false, error: `Status inválido para envio: ${escrow.status}` };
  }

  // Verify seller owns this order
  const { data: order } = await supabase
    .from('orders')
    .select('seller_id, buyer_id')
    .eq('id', orderId)
    .single();

  if (!order || order.seller_id !== sellerId) {
    return { success: false, error: 'Não autorizado' };
  }

  const { error: updateError } = await supabase
    .from('escrow_transactions')
    .update({ status: 'shipped', shipped_at: new Date().toISOString() })
    .eq('id', escrow.id);

  if (updateError) return { success: false, error: updateError.message };

  await supabase
    .from('orders')
    .update({
      escrow_status: 'shipped',
      delivery_status: 'in_transit',
      tracking_code: trackingCode ?? null,
      carrier: carrier ?? null,
    })
    .eq('id', orderId);

  await logEscrowAction(supabase, escrow.id, 'marked_shipped', sellerId, 'seller', 'payment_held', 'shipped', { tracking_code: trackingCode, carrier }, ipAddress);

  // Notify buyer
  await sendEscrowNotification(
    supabase, order.buyer_id, 'escrow_shipped',
    'Produto enviado!',
    `Seu produto está a caminho${trackingCode ? ` — Rastreio: ${trackingCode}` : ''}`,
    orderId
  );

  return { success: true };
}

// ==================== MARK AS DELIVERED (generates QR) ====================

export async function markAsDelivered(
  orderId: string,
  sellerId: string,
  ipAddress?: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  const { data: escrow, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error || !escrow) return { success: false, error: 'Escrow não encontrado' };
  if (!['shipped', 'payment_held'].includes(escrow.status)) {
    return { success: false, error: `Status inválido para marcar entrega: ${escrow.status}` };
  }

  // Verify seller
  const { data: order } = await supabase
    .from('orders')
    .select('seller_id, buyer_id, gross_value')
    .eq('id', orderId)
    .single();

  if (!order || order.seller_id !== sellerId) {
    return { success: false, error: 'Não autorizado' };
  }

  // Generate QR Code
  const qrSecret = getQRSecret();
  const qrPayload = buildQRPayload(orderId, order.buyer_id, order.seller_id, escrow.amount);
  const qrToken = generateQRToken(qrPayload, qrSecret);
  const qrHash = computeQRHash(qrToken);
  const qrExpiresAt = new Date(qrPayload.expiresAt).toISOString();
  const deliveredAt = new Date().toISOString();
  const autoReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('escrow_transactions')
    .update({
      status: 'delivered_pending_confirmation',
      delivered_at: deliveredAt,
      auto_release_at: autoReleaseAt,
      qr_hash: qrHash,
      qr_payload_encrypted: qrToken,
      qr_expires_at: qrExpiresAt,
      qr_used: false,
    })
    .eq('id', escrow.id);

  if (updateError) return { success: false, error: updateError.message };

  await supabase
    .from('orders')
    .update({ escrow_status: 'delivered_pending_confirmation', delivery_status: 'delivered' })
    .eq('id', orderId);

  await logEscrowAction(supabase, escrow.id, 'marked_delivered', sellerId, 'seller', escrow.status, 'delivered_pending_confirmation', {}, ipAddress);

  // Notify buyer
  await sendEscrowNotification(
    supabase, order.buyer_id, 'escrow_confirm_delivery',
    'Produto entregue — confirme o recebimento',
    'O vendedor marcou o produto como entregue. Escaneie o QR Code para confirmar.',
    orderId
  );

  const qrImageURL = getQRImageURL(qrToken);

  return {
    success: true,
    data: {
      qrToken,
      qrImageURL,
      qrExpiresAt,
      autoReleaseAt,
    },
  };
}

// ==================== CONFIRM DELIVERY (buyer scans QR) ====================

export async function confirmDelivery(
  orderId: string,
  buyerId: string,
  qrToken: string,
  ipAddress?: string,
  deviceFingerprint?: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  // Rate limiting check (max 5 failures in 60 min)
  const { data: failCount } = await supabase
    .rpc('count_qr_failures', {
      p_order_id: orderId,
      p_ip: ipAddress ?? '',
      p_window_minutes: 60,
    });

  if ((failCount as number) >= 5) {
    await recordQRAttempt(supabase, orderId, buyerId, false, 'Bloqueado por rate limit', ipAddress, deviceFingerprint);
    return { success: false, error: 'Muitas tentativas inválidas. Tente novamente mais tarde.' };
  }

  // Fetch escrow
  const { data: escrow, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error || !escrow) {
    await recordQRAttempt(supabase, orderId, buyerId, false, 'Escrow não encontrado', ipAddress, deviceFingerprint);
    return { success: false, error: 'Pedido não encontrado' };
  }

  if (escrow.status !== 'delivered_pending_confirmation') {
    await recordQRAttempt(supabase, orderId, buyerId, false, `Status inválido: ${escrow.status}`, ipAddress, deviceFingerprint);
    return { success: false, error: 'Este pedido não está aguardando confirmação' };
  }

  if (escrow.qr_used) {
    await recordQRAttempt(supabase, orderId, buyerId, false, 'QR já utilizado', ipAddress, deviceFingerprint);
    return { success: false, error: 'QR Code já foi utilizado' };
  }

  // Validate token
  const qrSecret = getQRSecret();
  const validation = validateQRToken(qrToken, qrSecret);

  if (!validation.valid || !validation.payload) {
    await recordQRAttempt(supabase, orderId, buyerId, false, validation.error ?? 'Token inválido', ipAddress, deviceFingerprint);
    return { success: false, error: validation.error ?? 'QR Code inválido' };
  }

  // Verify buyer matches
  if (validation.payload.buyerId !== buyerId) {
    await recordQRAttempt(supabase, orderId, buyerId, false, 'Comprador incorreto', ipAddress, deviceFingerprint);
    return { success: false, error: 'Este QR Code não pertence a você' };
  }

  // Verify order matches
  if (validation.payload.orderId !== orderId) {
    await recordQRAttempt(supabase, orderId, buyerId, false, 'Pedido incorreto', ipAddress, deviceFingerprint);
    return { success: false, error: 'QR Code inválido para este pedido' };
  }

  // Mark QR as used and update status
  const confirmedAt = new Date().toISOString();
  await supabase
    .from('escrow_transactions')
    .update({
      status: 'confirmed',
      confirmed_at: confirmedAt,
      qr_used: true,
      qr_used_at: confirmedAt,
    })
    .eq('id', escrow.id);

  await supabase
    .from('orders')
    .update({ escrow_status: 'confirmed', delivery_status: 'confirmed', buyer_confirmed: true, delivery_confirmed_at: confirmedAt })
    .eq('id', orderId);

  await recordQRAttempt(supabase, orderId, buyerId, true, null, ipAddress, deviceFingerprint);
  await logEscrowAction(supabase, escrow.id, 'delivery_confirmed_qr', buyerId, 'buyer', 'delivered_pending_confirmation', 'confirmed', {}, ipAddress);

  // Release payment
  return await releasePayment(orderId, buyerId, 'buyer', supabase);
}

// ==================== RELEASE PAYMENT ====================

export async function releasePayment(
  orderId: string,
  releasedBy: string,
  releasedByType: 'buyer' | 'admin' | 'system',
  supabaseOverride?: ReturnType<typeof createServerSupabase>
): Promise<EscrowActionResult> {
  const supabase = supabaseOverride ?? createServerSupabase();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (!escrow) return { success: false, error: 'Escrow não encontrado' };

  const releasedAt = new Date().toISOString();

  await supabase
    .from('escrow_transactions')
    .update({
      status: 'payment_released',
      released_at: releasedAt,
      released_by_admin: releasedByType === 'admin',
      released_by_actor: releasedBy,
    })
    .eq('id', escrow.id);

  await supabase
    .from('orders')
    .update({
      escrow_status: 'payment_released',
      payment_status: 'released',
      split_status: 'processing',
    })
    .eq('id', orderId);

  // Update payment_splits to processing
  await supabase
    .from('payment_splits')
    .update({ status: 'processing' })
    .eq('order_id', orderId);

  await logEscrowAction(supabase, escrow.id, 'payment_released', releasedBy, releasedByType, 'confirmed', 'payment_released', { released_by_type: releasedByType });

  // Notify seller
  const { data: order } = await supabase
    .from('orders')
    .select('seller_id, buyer_id')
    .eq('id', orderId)
    .single();

  if (order) {
    await sendEscrowNotification(
      supabase, order.seller_id, 'escrow_payment_released',
      'Pagamento liberado!',
      `R$ ${escrow.amount.toFixed(2)} foram liberados para você. Parabéns pela venda!`,
      orderId
    );
    await sendEscrowNotification(
      supabase, order.buyer_id, 'escrow_payment_released',
      'Transação concluída',
      'Pagamento liberado ao vendedor. Obrigado pela compra!',
      orderId
    );
  }

  return { success: true };
}

// ==================== OPEN DISPUTE ====================

export async function openDispute(
  orderId: string,
  buyerId: string,
  reason: string,
  description: string,
  evidenceUrls: string[] = [],
  ipAddress?: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (!escrow) return { success: false, error: 'Escrow não encontrado' };

  if (!['delivered_pending_confirmation', 'shipped'].includes(escrow.status)) {
    return { success: false, error: 'Disputa só pode ser aberta após o envio' };
  }

  // Verify buyer
  const { data: order } = await supabase
    .from('orders')
    .select('buyer_id, seller_id')
    .eq('id', orderId)
    .single();

  if (!order || order.buyer_id !== buyerId) {
    return { success: false, error: 'Não autorizado' };
  }

  // Create dispute
  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      order_id: orderId,
      escrow_transaction_id: escrow.id,
      opened_by: buyerId,
      reason,
      description,
      evidence_urls: evidenceUrls,
      status: 'open',
    })
    .select()
    .single();

  if (error) return { success: false, error: 'Erro ao abrir disputa: ' + error.message };

  // Update escrow and order status
  await supabase
    .from('escrow_transactions')
    .update({ status: 'disputed' })
    .eq('id', escrow.id);

  await supabase
    .from('orders')
    .update({ escrow_status: 'disputed', dispute_id: dispute.id })
    .eq('id', orderId);

  await logEscrowAction(supabase, escrow.id, 'dispute_opened', buyerId, 'buyer', escrow.status, 'disputed', { dispute_id: dispute.id, reason }, ipAddress);

  // Notify seller and admins
  await sendEscrowNotification(
    supabase, order.seller_id, 'escrow_dispute_opened',
    'Disputa aberta',
    `O comprador abriu uma disputa para o pedido. Motivo: ${reason}`,
    orderId
  );

  return { success: true, data: { disputeId: dispute.id } };
}

// ==================== RESOLVE DISPUTE (admin) ====================

export async function resolveDispute(
  disputeId: string,
  adminId: string,
  resolution: 'release_seller' | 'refund_buyer' | 'split',
  splitSellerPercent?: number,
  adminNotes?: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  const { data: dispute } = await supabase
    .from('disputes')
    .select('*, escrow_transaction_id, order_id')
    .eq('id', disputeId)
    .single();

  if (!dispute) return { success: false, error: 'Disputa não encontrada' };
  if (dispute.status !== 'open' && dispute.status !== 'under_review') {
    return { success: false, error: 'Disputa já resolvida' };
  }

  const resolvedAt = new Date().toISOString();

  await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution,
      split_seller_percent: resolution === 'split' ? splitSellerPercent : null,
      resolved_by: adminId,
      resolved_at: resolvedAt,
      admin_notes: adminNotes ?? null,
    })
    .eq('id', disputeId);

  const { data: order } = await supabase
    .from('orders')
    .select('buyer_id, seller_id')
    .eq('id', dispute.order_id)
    .single();

  if (resolution === 'release_seller') {
    await releasePayment(dispute.order_id, adminId, 'admin', supabase);
  } else if (resolution === 'refund_buyer') {
    await supabase
      .from('escrow_transactions')
      .update({ status: 'cancelled', released_at: resolvedAt })
      .eq('id', dispute.escrow_transaction_id);

    await supabase
      .from('orders')
      .update({ escrow_status: 'cancelled', payment_status: 'refunded' })
      .eq('id', dispute.order_id);

    if (order) {
      await sendEscrowNotification(
        supabase, order.buyer_id, 'escrow_dispute_resolved',
        'Disputa resolvida — reembolso aprovado',
        'Sua disputa foi resolvida. O reembolso será processado em breve.',
        dispute.order_id
      );
    }
  } else if (resolution === 'split' && splitSellerPercent !== undefined) {
    // Mark as released with split — actual split logic handled by payment system
    await releasePayment(dispute.order_id, adminId, 'admin', supabase);
    // Store split override for payment processing
    await supabase
      .from('escrow_transactions')
      .update({ release_reason: `split:${splitSellerPercent}` })
      .eq('id', dispute.escrow_transaction_id);
  }

  if (order) {
    await sendEscrowNotification(
      supabase, order.seller_id, 'escrow_dispute_resolved',
      'Disputa resolvida',
      `A disputa foi resolvida pelo admin. Resolução: ${resolution}`,
      dispute.order_id
    );
  }

  return { success: true };
}

// ==================== AUTO-RELEASE CRON ====================

/**
 * Called by cron job every hour.
 * Releases payments where auto_release_at <= NOW()
 * Sends reminder notifications at 48h and 24h before auto-release.
 */
export async function autoReleaseCheck(): Promise<{ released: number; reminders48h: number; reminders24h: number }> {
  const supabase = createServerSupabase();
  const now = new Date();
  let released = 0;
  let reminders48h = 0;
  let reminders24h = 0;

  // Auto-release overdue transactions
  const { data: overdue } = await supabase
    .from('escrow_transactions')
    .select('id, order_id, amount')
    .eq('status', 'delivered_pending_confirmation')
    .lte('auto_release_at', now.toISOString());

  if (overdue) {
    for (const tx of overdue) {
      const result = await releasePayment(tx.order_id, 'system', 'system', supabase);
      if (result.success) {
        released++;
        await logEscrowAction(supabase, tx.id, 'auto_released', null, 'system', 'delivered_pending_confirmation', 'payment_released', { reason: '7_days_no_confirmation' });
      }
    }
  }

  // Send 48h reminder
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const in47h = new Date(now.getTime() + 47 * 60 * 60 * 1000).toISOString();

  const { data: remind48 } = await supabase
    .from('escrow_transactions')
    .select('id, order_id')
    .eq('status', 'delivered_pending_confirmation')
    .eq('reminder_48h_sent', false)
    .gte('auto_release_at', in47h)
    .lte('auto_release_at', in48h);

  if (remind48) {
    for (const tx of remind48) {
      const { data: order } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', tx.order_id)
        .single();

      if (order) {
        await sendEscrowNotification(
          supabase, order.buyer_id, 'escrow_reminder_48h',
          'Lembrete: confirme o recebimento',
          'O pagamento será liberado automaticamente em 48h. Confirme agora se já recebeu.',
          tx.order_id
        );
        await supabase
          .from('escrow_transactions')
          .update({ reminder_48h_sent: true })
          .eq('id', tx.id);
        reminders48h++;
      }
    }
  }

  // Send 24h reminder
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();

  const { data: remind24 } = await supabase
    .from('escrow_transactions')
    .select('id, order_id')
    .eq('status', 'delivered_pending_confirmation')
    .eq('reminder_24h_sent', false)
    .gte('auto_release_at', in23h)
    .lte('auto_release_at', in24h);

  if (remind24) {
    for (const tx of remind24) {
      const { data: order } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', tx.order_id)
        .single();

      if (order) {
        await sendEscrowNotification(
          supabase, order.buyer_id, 'escrow_reminder_24h',
          'Última chance: confirme o recebimento',
          'O pagamento será liberado em 24h automaticamente. Abra a disputa se houver problema.',
          tx.order_id
        );
        await supabase
          .from('escrow_transactions')
          .update({ reminder_24h_sent: true })
          .eq('id', tx.id);
        reminders24h++;
      }
    }
  }

  return { released, reminders48h, reminders24h };
}

// ==================== HELPERS ====================

async function recordQRAttempt(
  supabase: ReturnType<typeof createServerSupabase>,
  orderId: string,
  buyerId: string | null,
  success: boolean,
  failureReason: string | null,
  ipAddress?: string,
  deviceFingerprint?: string
): Promise<void> {
  await supabase.from('qr_validation_attempts').insert({
    order_id: orderId,
    buyer_id: buyerId,
    ip_address: ipAddress ?? null,
    device_fingerprint: deviceFingerprint ?? null,
    success,
    failure_reason: failureReason,
  });
}

/**
 * Get escrow transaction with logs for order detail page
 */
export async function getEscrowDetails(orderId: string): Promise<{
  transaction: EscrowTransaction | null;
  logs: Record<string, unknown>[];
  dispute: Record<string, unknown> | null;
}> {
  const supabase = createServerSupabase();

  const { data: transaction } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  const { data: logs } = await supabase
    .from('escrow_logs')
    .select('*')
    .eq('transaction_id', transaction?.id ?? '')
    .order('created_at', { ascending: true });

  const { data: dispute } = await supabase
    .from('disputes')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return {
    transaction: transaction as EscrowTransaction | null,
    logs: (logs ?? []) as Record<string, unknown>[],
    dispute: dispute as Record<string, unknown> | null,
  };
}

/**
 * Regenerate QR if expired (before auto-release window)
 */
export async function regenerateQR(
  orderId: string,
  sellerId: string
): Promise<EscrowActionResult> {
  const supabase = createServerSupabase();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (!escrow || escrow.status !== 'delivered_pending_confirmation') {
    return { success: false, error: 'QR só pode ser regenerado quando aguarda confirmação' };
  }

  const { data: order } = await supabase
    .from('orders')
    .select('seller_id, buyer_id')
    .eq('id', orderId)
    .single();

  if (!order || order.seller_id !== sellerId) {
    return { success: false, error: 'Não autorizado' };
  }

  const qrSecret = getQRSecret();
  const qrPayload = buildQRPayload(orderId, order.buyer_id, order.seller_id, escrow.amount);
  const qrToken = generateQRToken(qrPayload, qrSecret);
  const qrHash = computeQRHash(qrToken);
  const qrExpiresAt = new Date(qrPayload.expiresAt).toISOString();

  await supabase
    .from('escrow_transactions')
    .update({
      qr_hash: qrHash,
      qr_payload_encrypted: qrToken,
      qr_expires_at: qrExpiresAt,
      qr_used: false,
      qr_used_at: null,
    })
    .eq('id', escrow.id);

  await logEscrowAction(supabase, escrow.id, 'qr_regenerated', sellerId, 'seller', null, null, {});

  return {
    success: true,
    data: {
      qrToken,
      qrImageURL: getQRImageURL(qrToken),
      qrExpiresAt,
    },
  };
}
