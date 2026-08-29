import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ROLES = ['admin_financial', 'admin_operational'] as const;

/**
 * Movimentação financeira do marketplace.
 *
 * A fonte de verdade é `orders`: é lá que o checkout grava os valores
 * decompostos (bruto, taxa da plataforma, taxa do gateway, doação, líquido do
 * vendedor). A tabela `payments` é usada apenas para enriquecer com o meio de
 * pagamento quando o registro existir.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ROLES);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const status = req.nextUrl.searchParams.get('status');

  let query = admin
    .from('orders')
    .select(
      'id, product_id, buyer_id, seller_id, gross_value, platform_fee, gateway_fee, donation_value, seller_net_value, payment_status, payment_provider, transaction_id, split_status, escrow_status, refund_amount, refunded_at, paid_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') query = query.eq('payment_status', status);

  const [ordersRes, paymentsRes] = await Promise.all([
    query,
    admin.from('payments').select('order_id, method, card_brand, installments, status'),
  ]);

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });

  const rows = ordersRes.data ?? [];
  const paymentByOrder = new Map(
    (paymentsRes.data ?? []).map((p) => [p.order_id, p])
  );

  // Partes envolvidas
  const userIds = Array.from(
    new Set([...rows.map((o) => o.buyer_id), ...rows.map((o) => o.seller_id)].filter(Boolean))
  ) as string[];
  const productIds = Array.from(new Set(rows.map((o) => o.product_id).filter(Boolean))) as string[];

  const users = new Map<string, string>();
  const products = new Map<string, string>();

  await Promise.all([
    userIds.length
      ? admin.from('users').select('id, name, email').in('id', userIds).then(({ data }) => {
          for (const u of data ?? []) users.set(u.id, u.name || u.email || 'Usuário');
        })
      : Promise.resolve(),
    productIds.length
      ? admin.from('products').select('id, title').in('id', productIds).then(({ data }) => {
          for (const p of data ?? []) products.set(p.id, p.title ?? 'Produto removido');
        })
      : Promise.resolve(),
  ]);

  const items = rows.map((o) => {
    const pay = paymentByOrder.get(o.id);
    return {
      id: o.id,
      product_title: o.product_id ? products.get(o.product_id) || 'Produto removido' : '—',
      buyer_name: o.buyer_id ? users.get(o.buyer_id) || 'Usuário removido' : '—',
      seller_name: o.seller_id ? users.get(o.seller_id) || 'Usuário removido' : '—',
      gross_value: Number(o.gross_value || 0),
      platform_fee: Number(o.platform_fee || 0),
      gateway_fee: Number(o.gateway_fee || 0),
      donation_value: Number(o.donation_value || 0),
      seller_net_value: Number(o.seller_net_value || 0),
      refund_amount: Number(o.refund_amount || 0),
      payment_status: o.payment_status,
      split_status: o.split_status,
      escrow_status: o.escrow_status,
      provider: o.payment_provider || 'pagbank',
      method: pay?.method || null,
      card_brand: pay?.card_brand || null,
      installments: pay?.installments || null,
      transaction_id: o.transaction_id,
      paid_at: o.paid_at,
      refunded_at: o.refunded_at,
      created_at: o.created_at,
    };
  });

  const sumWhere = (pred: (o: (typeof items)[number]) => boolean, field: keyof (typeof items)[number]) =>
    items.filter(pred).reduce((acc, o) => acc + Number(o[field] || 0), 0);

  const PAID = ['paid', 'held', 'released'];
  const isPaid = (o: (typeof items)[number]) => PAID.includes(o.payment_status);

  return NextResponse.json({
    payments: items,
    metrics: {
      // GMV: volume transacionado em pedidos efetivamente pagos.
      gmv: sumWhere(isPaid, 'gross_value'),
      // Receita da plataforma: só a taxa retida.
      revenue: sumWhere(isPaid, 'platform_fee'),
      gatewayFees: sumWhere(isPaid, 'gateway_fee'),
      donated: sumWhere(isPaid, 'donation_value'),
      sellerPayouts: sumWhere(isPaid, 'seller_net_value'),
      heldAmount: sumWhere((o) => o.payment_status === 'held', 'gross_value'),
      pendingAmount: sumWhere((o) => o.payment_status === 'pending', 'gross_value'),
      refundedAmount: sumWhere((o) => o.payment_status === 'refunded', 'refund_amount'),
      counts: {
        total: items.length,
        paid: items.filter((o) => o.payment_status === 'paid').length,
        held: items.filter((o) => o.payment_status === 'held').length,
        released: items.filter((o) => o.payment_status === 'released').length,
        pending: items.filter((o) => o.payment_status === 'pending').length,
        refunded: items.filter((o) => o.payment_status === 'refunded').length,
        disputed: items.filter((o) => o.payment_status === 'disputed').length,
        failed: items.filter((o) => o.payment_status === 'failed').length,
      },
    },
  });
}
