import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserId, getServiceClient } from '@/lib/api-auth';
// Usar push-notifications.ts: faz DB insert + web-push real
import {
  notifyNewOrder as pushNotifyNewOrder,
  notifyPaymentReceived as pushNotifyPaymentReceived,
} from '@/lib/push-notifications';
// Fallback DB-only (quando VAPID não configurado)
import { notifyPaymentReceived, notifyOrderStatus } from '@/lib/server-notifications';
import { PLATFORM_FEE_PERCENT } from '@/lib/constants';

/**
 * A tabela public.orders não possui as colunas `amount`, `status`,
 * `payment_method`, `installments`, `coupon_code`, `coupon_discount`,
 * `address`, `shipped_at` nem `delivered_at`.
 * O schema real usa `gross_value`, `payment_status`, `delivery_status`
 * e um campo `metadata` jsonb. As funções abaixo fazem a tradução para
 * manter o contrato externo da API estável.
 */
const ORDER_COLUMNS = `
  id, gross_value, platform_fee, gateway_fee, seller_net_value,
  payment_status, delivery_status, delivery_type, escrow_status,
  tracking_code, carrier, payment_id, reference_id, transaction_id,
  paid_at, delivery_confirmed_at, created_at, updated_at, metadata,
  product:products(id, title, images:product_images(url)),
  buyer:users!orders_buyer_id_fkey(id, name, avatar_url),
  seller:users!orders_seller_id_fkey(id, name, avatar_url)
`;

function toApiOrder(row: any) {
  const meta = row?.metadata || {};
  return {
    ...row,
    // aliases usados pelo front-end
    amount: Number(row?.gross_value ?? 0),
    status: row?.delivery_status || row?.payment_status || 'pending',
    payment_method: meta.payment_method ?? null,
    installments: meta.installments ?? 1,
    coupon_code: meta.coupon_code ?? null,
    coupon_discount: meta.coupon_discount ?? 0,
    address: meta.address ?? null,
    shipped_at: meta.shipped_at ?? null,
    delivered_at: meta.delivered_at ?? row?.delivery_confirmed_at ?? null,
  };
}

// ─── POST /api/orders — criar pedido ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const supabase = getServiceClient();

    const body = await req.json();
    const {
      product_id,
      delivery_type,
      payment_method,
      installments,
      payment_id,
      coupon_code,
      coupon_discount,
      address,
    } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'product_id é obrigatório.' }, { status: 400 });
    }

    // Resolve buyer_id = id público na tabela users (FK de orders)
    const { data: buyerProfile } = await supabase
      .from('users')
      .select('id, name')
      .eq('auth_id', authUserId)
      .single();

    const buyer_id = buyerProfile?.id;
    if (!buyer_id) {
      return NextResponse.json({ error: 'Perfil de comprador não encontrado.' }, { status: 404 });
    }

    // Preço e vendedor vêm do banco — nunca do cliente
    const { data: product } = await supabase
      .from('products')
      .select('id, title, price, user_id, status, donation_enabled, donation_type, donation_value')
      .eq('id', product_id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    }
    if (product.user_id === buyer_id) {
      return NextResponse.json({ error: 'Você não pode comprar seu próprio produto.' }, { status: 400 });
    }

    const seller_id = product.user_id;
    const gross = Number(product.price);
    const isPix = (payment_method || 'pix') === 'pix';

    const platformFee = +(gross * (PLATFORM_FEE_PERCENT / 100)).toFixed(2);
    const gatewayFee = +(gross * (isPix ? 0.015 : 0.035)).toFixed(2);
    const donationValue = product.donation_enabled && product.donation_value
      ? (product.donation_type === 'percentage'
          ? +(gross * (Number(product.donation_value) / 100)).toFixed(2)
          : Number(product.donation_value))
      : 0;
    const sellerNet = +(gross - platformFee - gatewayFee - donationValue).toFixed(2);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id,
        seller_id,
        buyer_id,
        gross_value: gross,
        platform_fee: platformFee,
        gateway_fee: gatewayFee,
        donation_value: donationValue,
        seller_net_value: sellerNet,
        payment_status: isPix ? 'pending' : 'paid',
        payment_provider: 'pagbank',
        payment_id: payment_id || null,
        escrow_status: isPix ? 'pending' : 'held',
        delivery_type: delivery_type || 'local_pickup',
        delivery_status: 'pending',
        buyer_confirmed: false,
        seller_confirmed: false,
        paid_at: isPix ? null : new Date().toISOString(),
        metadata: {
          payment_method: payment_method || 'pix',
          installments: installments || 1,
          coupon_code: coupon_code || null,
          coupon_discount: coupon_discount || 0,
          address: address || null,
        },
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('[POST /api/orders] orderError:', orderError.message);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const orderId = order.id;
    const productTitle = product.title || 'Produto';
    const buyerName = buyerProfile?.name || 'Comprador';

    const notifPromises: Promise<void>[] = [
      pushNotifyNewOrder(seller_id, {
        orderId,
        productName: productTitle,
        buyerName,
        amount: gross,
      }),
    ];

    if (!isPix) {
      notifPromises.push(pushNotifyPaymentReceived(seller_id, gross, orderId));
      notifPromises.push(
        (async () => {
          await supabase.from('products').update({ status: 'sold' }).eq('id', product_id);
        })()
      );
    }

    Promise.all(notifPromises).catch((e) =>
      console.error('[POST /api/orders] notification error:', e)
    );

    return NextResponse.json({ orderId, status: 'created' }, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/orders] unexpected error:', e);
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}

// ─── PATCH /api/orders — atualizar status ──────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const supabase = getServiceClient();

    const body = await req.json();
    const { orderId, status, tracking_code, carrier, coupon_code, coupon_discount } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório.' }, { status: 400 });
    }
    if (!status && !tracking_code && !coupon_code) {
      return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .single();
    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });

    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, seller_id, gross_value, metadata, product:products(title)')
      .eq('id', orderId)
      .single();

    if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    if (order.buyer_id !== profile.id && order.seller_id !== profile.id) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const meta: Record<string, unknown> = { ...(order.metadata as object || {}) };
    const updatePayload: Record<string, unknown> = {};

    if (status) {
      updatePayload.delivery_status = status;
      if (status === 'shipped') meta.shipped_at = now;
      if (status === 'delivered') {
        meta.delivered_at = now;
        updatePayload.delivery_confirmed_at = now;
      }
    }
    if (tracking_code) updatePayload.tracking_code = tracking_code;
    if (carrier) updatePayload.carrier = carrier;
    if (coupon_code) {
      meta.coupon_code = coupon_code;
      meta.coupon_discount = coupon_discount ?? 0;
    }
    updatePayload.metadata = meta;

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (status) {
      const productTitle = (order.product as any)?.title || 'Produto';
      notifyOrderStatus(order.buyer_id, { orderId, productTitle, status }).catch(console.error);

      if (status === 'delivered') {
        notifyPaymentReceived(order.seller_id, {
          orderId,
          productTitle,
          amount: Number(order.gross_value) || 0,
        }).catch(console.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}

// ─── GET /api/orders — listar pedidos do usuário ───────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authUserId = await getAuthUserId(req);
    if (!authUserId) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const supabase = getServiceClient();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || 'buyer';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .single();
    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });

    const from = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS, { count: 'exact' })
      .eq(role === 'seller' ? 'seller_id' : 'buyer_id', profile.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      orders: (data || []).map(toApiOrder),
      total: count || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
