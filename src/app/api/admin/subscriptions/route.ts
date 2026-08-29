import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface PlanRow {
  id: string;
  name: string;
  price_monthly: number | string;
  price_yearly: number | string;
  max_listings: number | null;
  boost_credits: number | null;
  ai_credits: number | null;
  highlight: boolean | null;
  active: boolean | null;
  features: unknown;
}

/**
 * Assinaturas + planos + receita recorrente.
 *
 * O MRR é derivado de `subscription_plans.price_monthly` das assinaturas com
 * status `active` — não é um valor arbitrado no frontend.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_financial', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const status = req.nextUrl.searchParams.get('status');

  const [plansRes, subsRes] = await Promise.all([
    admin.from('subscription_plans').select('*').order('price_monthly'),
    (() => {
      let q = admin
        .from('subscriptions')
        .select('id, user_id, plan_id, status, started_at, next_billing_at, cancelled_at, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (status && status !== 'all') q = q.eq('status', status);
      return q;
    })(),
  ]);

  if (plansRes.error) return NextResponse.json({ error: plansRes.error.message }, { status: 500 });
  if (subsRes.error) return NextResponse.json({ error: subsRes.error.message }, { status: 500 });

  const plans = (plansRes.data ?? []) as PlanRow[];
  const subs = subsRes.data ?? [];

  const priceById = new Map(plans.map((p) => [p.id, Number(p.price_monthly) || 0]));
  const nameById = new Map(plans.map((p) => [p.id, p.name]));

  // Assinantes
  const userIds = Array.from(new Set(subs.map((s) => s.user_id).filter(Boolean))) as string[];
  const users = new Map<string, { name: string; email: string }>();
  if (userIds.length) {
    const { data } = await admin.from('users').select('id, name, email').in('id', userIds);
    for (const u of data ?? []) users.set(u.id, { name: u.name ?? '', email: u.email ?? '' });
  }

  const items = subs.map((s) => ({
    ...s,
    plan_name: nameById.get(s.plan_id) || s.plan_id,
    plan_price: priceById.get(s.plan_id) ?? 0,
    user_name: s.user_id ? users.get(s.user_id)?.name || 'Usuário removido' : '—',
    user_email: s.user_id ? users.get(s.user_id)?.email || '' : '',
  }));

  const activeSubs = items.filter((s) => s.status === 'active');
  const mrr = activeSubs.reduce((sum, s) => sum + s.plan_price, 0);

  // Distribuição por plano, considerando também os usuários no plano gratuito
  // que ainda não têm linha em `subscriptions`.
  const { count: totalUsers } = await admin
    .from('users')
    .select('id', { count: 'exact', head: true });

  const byPlan = plans.map((p) => {
    const count = activeSubs.filter((s) => s.plan_id === p.id).length;
    return {
      id: p.id,
      name: p.name,
      price_monthly: Number(p.price_monthly) || 0,
      price_yearly: Number(p.price_yearly) || 0,
      max_listings: p.max_listings,
      boost_credits: p.boost_credits,
      ai_credits: p.ai_credits,
      highlight: !!p.highlight,
      active: p.active !== false,
      features: Array.isArray(p.features) ? p.features : [],
      subscribers: count,
      mrr: count * (Number(p.price_monthly) || 0),
    };
  });

  return NextResponse.json({
    subscriptions: items,
    plans: byPlan,
    metrics: {
      total: items.length,
      active: activeSubs.length,
      cancelled: items.filter((s) => s.status === 'cancelled').length,
      mrr,
      arr: mrr * 12,
      arpu: activeSubs.length ? mrr / activeSubs.length : 0,
      totalUsers: totalUsers ?? 0,
      conversionRate: totalUsers ? (activeSubs.length / totalUsers) * 100 : 0,
    },
  });
}
