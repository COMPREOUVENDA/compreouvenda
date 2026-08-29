import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ROLES = ['admin_financial', 'admin_operational'] as const;

const amountOf = (d: { calculated_amount?: number | null; donation_value?: number | null }) =>
  Number(d.calculated_amount ?? d.donation_value ?? 0);

/**
 * Doações do módulo solidário.
 *
 * Além dos lançamentos em `donations`, expomos o total comprometido em
 * `orders.donation_value` — é lá que a doação nasce no checkout, e a diferença
 * entre os dois números indica repasses ainda não lançados.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ROLES);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const status = req.nextUrl.searchParams.get('status');

  let query = admin
    .from('donations')
    .select('id, order_id, product_id, charity_id, donor_id, donation_type, donation_value, calculated_amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') query = query.eq('status', status);

  const [donationsRes, charitiesRes, ordersRes] = await Promise.all([
    query,
    admin.from('charities').select('id, name, verified, active'),
    admin
      .from('orders')
      .select('donation_value, payment_status')
      .in('payment_status', ['paid', 'held', 'released']),
  ]);

  if (donationsRes.error) return NextResponse.json({ error: donationsRes.error.message }, { status: 500 });

  const rows = donationsRes.data ?? [];
  const charities = charitiesRes.data ?? [];
  const charityById = new Map(charities.map((c) => [c.id, c.name]));

  // Doadores e produtos
  const donorIds = Array.from(new Set(rows.map((d) => d.donor_id).filter(Boolean))) as string[];
  const productIds = Array.from(new Set(rows.map((d) => d.product_id).filter(Boolean))) as string[];

  const donors = new Map<string, string>();
  const products = new Map<string, string>();

  await Promise.all([
    donorIds.length
      ? admin.from('users').select('id, name, email').in('id', donorIds).then(({ data }) => {
          for (const u of data ?? []) donors.set(u.id, u.name || u.email || 'Usuário');
        })
      : Promise.resolve(),
    productIds.length
      ? admin.from('products').select('id, title').in('id', productIds).then(({ data }) => {
          for (const p of data ?? []) products.set(p.id, p.title ?? 'Produto removido');
        })
      : Promise.resolve(),
  ]);

  const items = rows.map((d) => ({
    ...d,
    amount: amountOf(d),
    charity_name: d.charity_id ? charityById.get(d.charity_id) || 'Instituição removida' : '—',
    donor_name: d.donor_id ? donors.get(d.donor_id) || 'Usuário removido' : '—',
    product_title: d.product_id ? products.get(d.product_id) || 'Produto removido' : '—',
  }));

  const sumBy = (s: string) =>
    items.filter((d) => d.status === s).reduce((acc, d) => acc + d.amount, 0);

  // Total prometido no checkout (fonte: pedidos pagos)
  const committed = (ordersRes.data ?? []).reduce(
    (acc, o) => acc + Number(o.donation_value || 0), 0
  );

  const transferred = sumBy('transferred');
  const confirmed = sumBy('confirmed');
  const pending = sumBy('pending');

  return NextResponse.json({
    donations: items,
    charities: charities
      .filter((c) => c.active !== false)
      .map((c) => ({ id: c.id, name: c.name, verified: c.verified })),
    metrics: {
      total: items.length,
      totalAmount: transferred + confirmed + pending,
      transferred,
      confirmed,
      pending,
      committed,
      // Doação já cobrada do comprador mas sem lançamento em `donations`.
      unreconciled: Math.max(0, committed - (transferred + confirmed + pending)),
      activeCharities: charities.filter((c) => c.active !== false).length,
    },
  });
}

const VALID_STATUS = ['pending', 'confirmed', 'transferred', 'failed'] as const;

/**
 * Confirma ou marca como repassada uma doação.
 * Ao transferir, o acumulador `charities.total_received` é atualizado.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !status || !VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
    return NextResponse.json({ error: 'Informe `id` e um `status` válido' }, { status: 400 });
  }

  const admin = getServiceClient();

  const { data: current } = await admin
    .from('donations')
    .select('id, charity_id, status, calculated_amount, donation_value, donor_id')
    .eq('id', id)
    .single();

  if (!current) return NextResponse.json({ error: 'Doação não encontrada' }, { status: 404 });

  const { data, error } = await admin
    .from('donations')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Só creditamos o acumulador na transição para `transferred`, para não
  // somar duas vezes se o admin reabrir e fechar o mesmo lançamento.
  if (status === 'transferred' && current.status !== 'transferred' && current.charity_id) {
    const { data: charity } = await admin
      .from('charities')
      .select('total_received, supporters')
      .eq('id', current.charity_id)
      .single();

    if (charity) {
      await admin
        .from('charities')
        .update({
          total_received: Number(charity.total_received || 0) + amountOf(current),
          supporters: Number(charity.supporters || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.charity_id);
    }
  }

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: `donation_${status}`,
      target_type: 'donation',
      target_id: id,
      details: { status, amount: amountOf(current) },
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ donation: data });
}
