import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyNewOrder, notifyPaymentReceived, notifyOrderStatus } from '@/lib/server-notifications';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── POST /api/orders — criar pedido ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product_id,
      seller_id,
      buyer_id,
      amount,
      delivery_type,
      payment_method,
      installments,
      payment_id,
      coupon_code,
      coupon_discount,
      address,
    } = body;

    if (!product_id || !seller_id || !buyer_id || !amount) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // 1. Buscar dados do produto e comprador para a notificação
    const [{ data: product }, { data: buyer }] = await Promise.all([
      supabase.from('products').select('title, price').eq('id', product_id).single(),
      supabase.from('users').select('name').eq('id', buyer_id).single(),
    ]);

    // 2. Inserir o pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id,
        seller_id,
        buyer_id,
        amount,
        delivery_type: delivery_type || 'pickup',
        payment_method: payment_method || 'pix',
        installments: installments || 1,
        payment_id: payment_id || null,
        coupon_code: coupon_code || null,
        coupon_discount: coupon_discount || 0,
        address: address || null,
        status: payment_method === 'pix' ? 'pending_payment' : 'confirmed',
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('[POST /api/orders] orderError:', orderError.message);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const orderId = order.id;
    const productTitle = (product as any)?.title || 'Produto';
    const buyerName = (buyer as any)?.name || 'Comprador';

    // 3. Notificar vendedor em background (não bloqueia resposta)
    const notifPromises: Promise<void>[] = [
      notifyNewOrder(seller_id, {
        orderId,
        productTitle,
        amount,
        buyerName,
      }),
    ];

    // 4. Se pagamento confirmado imediatamente (cartão), notificar pagamento recebido
    if (payment_method !== 'pix') {
      notifPromises.push(
        notifyPaymentReceived(seller_id, { orderId, productTitle, amount })
      );
    }

    // 5. Marcar produto como vendido
    notifPromises.push(
      (async () => {
        await supabase.from('products').update({ status: 'sold' }).eq('id', product_id);
      })()
    );

    // Disparar em paralelo sem awaitar (evita timeout na resposta)
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
    const body = await req.json();
    const { orderId, status, tracking_code } = body;

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId e status são obrigatórios.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Buscar pedido atual para notificação
    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, seller_id, amount, product:products(title)')
      .eq('id', orderId)
      .single();

    const updatePayload: Record<string, unknown> = { status };
    if (tracking_code) updatePayload.tracking_code = tracking_code;
    if (status === 'shipped') updatePayload.shipped_at = new Date().toISOString();
    if (status === 'delivered') updatePayload.delivered_at = new Date().toISOString();

    const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notificar comprador sobre mudança de status
    if (order) {
      const productTitle = (order.product as any)?.title || 'Produto';
      notifyOrderStatus((order as any).buyer_id, { orderId, productTitle, status }).catch(console.error);

      // Ao confirmar entrega, notificar vendedor do pagamento liberado
      if (status === 'delivered') {
        notifyPaymentReceived((order as any).seller_id, {
          orderId,
          productTitle,
          amount: (order as any).amount,
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'buyer'; // 'buyer' | 'seller'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) return NextResponse.json({ error: 'userId obrigatório.' }, { status: 400 });

    const supabase = getServiceClient();
    const from = (page - 1) * limit;

    const query = supabase
      .from('orders')
      .select(`
        id, status, amount, payment_method, delivery_type,
        created_at, shipped_at, delivered_at, tracking_code,
        product:products(id, title, images:product_images(url)),
        buyer:users!orders_buyer_id_fkey(id, name, avatar_url),
        seller:users!orders_seller_id_fkey(id, name, avatar_url)
      `)
      .eq(role === 'seller' ? 'seller_id' : 'buyer_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ orders: data || [], total: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
