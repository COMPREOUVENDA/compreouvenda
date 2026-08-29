import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const PAID = ['paid', 'held', 'released'];

interface SplitLeg {
  recipient_type: 'seller' | 'reseller' | 'charity' | 'platform';
  amount: number;
  status: string;
  provider_split_id: string | null;
  planned: boolean;
}

/**
 * Split de pagamento por pedido.
 *
 * Cada pedido guarda a decomposição do valor (`platform_fee`, `donation_value`,
 * `reseller_commission_value`, `seller_net_value`) — esse é o split *planejado*.
 * A execução no provedor é registrada em `payment_splits` — o split *executado*.
 *
 * Expor os dois lados evita o cenário em que o pedido é cobrado do comprador mas
 * o repasse nunca é lançado: a diferença aparece como divergência.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_financial', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const status = req.nextUrl.searchParams.get('status');

  let query = admin
    .from('orders')
    .select(
      'id, product_id, buyer_id, seller_id, reseller_id, gross_value, platform_fee, gateway_fee, donation_value, reseller_commission_value, seller_net_value, payment_status, split_status, created_at'
    )
    .in('payment_status', PAID)
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') query = query.eq('split_status', status);

  const [ordersRes, legsRes] = await Promise.all([
    query,
    admin.from('payment_splits').select('order_id, recipient_type, amount, status, provider_split_id'),
  ]);

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });

  const orders = ordersRes.data ?? [];
  const legsByOrder = new Map<string, typeof legsRes.data>();
  for (const leg of legsRes.data ?? []) {
    const arr = legsByOrder.get(leg.order_id) ?? [];
    arr.push(leg);
    legsByOrder.set(leg.order_id, arr);
  }

  // Partes envolvidas
  const userIds = Array.from(
    new Set([...orders.map((o) => o.buyer_id), ...orders.map((o) => o.seller_id)].filter(Boolean))
  ) as string[];
  const productIds = Array.from(new Set(orders.map((o) => o.product_id).filter(Boolean))) as string[];

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

  const items = orders.map((o) => {
    const executed = legsByOrder.get(o.id) ?? [];
    const executedByType = new Map(executed.map((l) => [l.recipient_type, l]));

    // Pernas planejadas a partir da decomposição gravada no pedido.
    const plannedLegs: Array<{ type: SplitLeg['recipient_type']; amount: number }> = [
      { type: 'seller', amount: Number(o.seller_net_value || 0) },
      { type: 'platform', amount: Number(o.platform_fee || 0) },
    ];
    if (Number(o.reseller_commission_value || 0) > 0) {
      plannedLegs.push({ type: 'reseller', amount: Number(o.reseller_commission_value) });
    }
    if (Number(o.donation_value || 0) > 0) {
      plannedLegs.push({ type: 'charity', amount: Number(o.donation_value) });
    }

    const legs: SplitLeg[] = plannedLegs.map((p) => {
      const done = executedByType.get(p.type);
      return {
        recipient_type: p.type,
        amount: done ? Number(done.amount) : p.amount,
        status: done?.status ?? 'not_created',
        provider_split_id: done?.provider_split_id ?? null,
        planned: !done,
      };
    });

    const plannedTotal = plannedLegs.reduce((a, l) => a + l.amount, 0);
    const executedTotal = executed.reduce((a, l) => a + Number(l.amount || 0), 0);

    return {
      id: o.id,
      product_title: o.product_id ? products.get(o.product_id) || 'Produto removido' : '—',
      buyer_name: o.buyer_id ? users.get(o.buyer_id) || 'Usuário removido' : '—',
      seller_name: o.seller_id ? users.get(o.seller_id) || 'Usuário removido' : '—',
      gross_value: Number(o.gross_value || 0),
      gateway_fee: Number(o.gateway_fee || 0),
      seller_net_value: Number(o.seller_net_value || 0),
      platform_fee: Number(o.platform_fee || 0),
      donation_value: Number(o.donation_value || 0),
      reseller_commission_value: Number(o.reseller_commission_value || 0),
      payment_status: o.payment_status,
      split_status: o.split_status ?? 'pending',
      legs,
      legs_executed: executed.length,
      legs_planned: plannedLegs.length,
      planned_total: plannedTotal,
      executed_total: executedTotal,
      // Diferença entre o bruto e a soma das pernas + taxa do gateway.
      residual: Number(
        (Number(o.gross_value || 0) - plannedTotal - Number(o.gateway_fee || 0)).toFixed(2)
      ),
      created_at: o.created_at,
    };
  });

  const sum = (f: (o: (typeof items)[number]) => number) => items.reduce((a, o) => a + f(o), 0);
  const semLancamento = items.filter((o) => o.legs_executed === 0);

  return NextResponse.json({
    splits: items,
    metrics: {
      volume: sum((o) => o.gross_value),
      platform: sum((o) => o.platform_fee),
      seller: sum((o) => o.seller_net_value),
      charity: sum((o) => o.donation_value),
      reseller: sum((o) => o.reseller_commission_value),
      gateway: sum((o) => o.gateway_fee),
      counts: {
        total: items.length,
        completed: items.filter((o) => o.split_status === 'completed').length,
        processing: items.filter((o) => o.split_status === 'processing').length,
        pending: items.filter((o) => o.split_status === 'pending').length,
        failed: items.filter((o) => o.split_status === 'failed').length,
      },
      // Pedidos pagos cujo split nunca foi lançado em `payment_splits`.
      missingLegs: semLancamento.length,
      missingAmount: semLancamento.reduce((a, o) => a + o.planned_total, 0),
      // Pedidos em que bruto != soma das pernas + gateway (erro de cálculo).
      inconsistent: items.filter((o) => Math.abs(o.residual) > 0.01).length,
    },
  });
}
