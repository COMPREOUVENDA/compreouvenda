import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const PAID = ['paid', 'held', 'released'];

interface OrderRow {
  gross_value: number | null;
  platform_fee: number | null;
  gateway_fee: number | null;
  donation_value: number | null;
  seller_net_value: number | null;
  reseller_commission_value: number | null;
  payment_status: string;
  created_at: string;
}

/** Soma um campo numérico de uma lista de pedidos. */
const sum = (rows: OrderRow[], field: keyof OrderRow) =>
  rows.reduce((acc, r) => acc + Number(r[field] || 0), 0);

/** Agrupa pedidos pagos por chave de período e devolve os totais. */
function aggregate(rows: OrderRow[], keyOf: (d: Date) => string, labelOf: (d: Date) => string) {
  const buckets = new Map<string, { label: string; vendas: number; receita: number; plataforma: number; comissoes: number; doacoes: number }>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = keyOf(d);
    const b = buckets.get(key) ?? {
      label: labelOf(d), vendas: 0, receita: 0, plataforma: 0, comissoes: 0, doacoes: 0,
    };
    b.vendas += 1;
    b.receita += Number(r.gross_value || 0);
    b.plataforma += Number(r.platform_fee || 0);
    b.comissoes += Number(r.reseller_commission_value || 0);
    b.doacoes += Number(r.donation_value || 0);
    buckets.set(key, b);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([, v]) => v);
}

/**
 * Painel comercial: receita, planos, cupons e destaques.
 *
 * Todos os números vêm de `orders`, `subscriptions`, `coupons` e
 * `featured_products`. Nenhum valor é estimado no frontend.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_financial', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();

  const [ordersRes, plansRes, subsRes, couponsRes, featuredRes, commissionsRes, usersRes, productsRes,
         revenueRes, campaignsRes] =
    await Promise.all([
      admin
        .from('orders')
        .select('gross_value, platform_fee, gateway_fee, donation_value, seller_net_value, reseller_commission_value, payment_status, created_at'),
      admin.from('subscription_plans').select('*').order('price_monthly'),
      admin.from('subscriptions').select('id, plan_id, status'),
      admin.from('coupons').select('*').order('created_at', { ascending: false }).limit(50),
      admin.from('featured_products').select('*').limit(50),
      admin.from('commissions').select('*').limit(50),
      admin.from('users').select('id', { count: 'exact', head: true }),
      admin.from('products').select('id', { count: 'exact', head: true }),
      // Fontes de receita que não possuem tabela própria (clube, publicidade, IA).
      admin.from('revenue_entries').select('source, gross_value, net_value, status, occurred_at'),
      admin.from('partner_campaigns').select('amount_paid, status, created_at'),
    ]);

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });

  const allOrders = (ordersRes.data ?? []) as OrderRow[];
  const paid = allOrders.filter((o) => PAID.includes(o.payment_status));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const inMonth = paid.filter((o) => new Date(o.created_at) >= startOfMonth);
  const inPrevMonth = paid.filter((o) => {
    const d = new Date(o.created_at);
    return d >= startOfPrevMonth && d < startOfMonth;
  });

  const gmvMonth = sum(inMonth, 'gross_value');
  const gmvPrev = sum(inPrevMonth, 'gross_value');
  // Variação só faz sentido quando existe base de comparação.
  const growth = gmvPrev > 0 ? ((gmvMonth - gmvPrev) / gmvPrev) * 100 : null;

  const subs = subsRes.data ?? [];
  const plans = plansRes.data ?? [];
  const activeSubs = subs.filter((s) => s.status === 'active');
  const priceById = new Map(plans.map((p) => [p.id, Number(p.price_monthly) || 0]));
  const mrr = activeSubs.reduce((acc, s) => acc + (priceById.get(s.plan_id) ?? 0), 0);

  // Receita dos últimos 7 dias, em ordem cronológica.
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const daily: { day: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const value = paid
      .filter((o) => o.created_at.slice(0, 10) === key)
      .reduce((acc, o) => acc + Number(o.gross_value || 0), 0);
    daily.push({ day: DAYS[d.getDay()], value });
  }
  const maxDaily = Math.max(...daily.map((d) => d.value), 1);

  const gmvTotal = sum(paid, 'gross_value');

  // ─── Central Financeira: consolidação de todas as fontes de receita ───
  // Cada fonte é lida da sua tabela de origem. Nada é duplicado: a
  // intermediação vem de `orders`, as assinaturas de `subscriptions`, os
  // destaques de `featured_products` e as demais de `revenue_entries`.
  const revenueEntries = (revenueRes.data ?? []) as any[];
  const confirmedRevenue = revenueEntries.filter((r) => r.status === 'confirmed');
  const partnerCampaigns = (campaignsRes.data ?? []) as any[];
  const featuredRows = (featuredRes.data ?? []) as any[];

  const inThisMonth = (iso: string | null) => !!iso && new Date(iso) >= startOfMonth;
  const sumBy = (rows: any[], field: string, filter?: (r: any) => boolean) =>
    rows.filter((r) => (filter ? filter(r) : true)).reduce((acc, r) => acc + Number(r[field] || 0), 0);
  const fromEntries = (sources: string[], monthOnly = false) =>
    sumBy(confirmedRevenue, 'net_value',
      (r) => sources.includes(r.source) && (!monthOnly || inThisMonth(r.occurred_at)));

  const featuredTotal = sumBy(featuredRows, 'price_paid');
  const adsTotal = sumBy(partnerCampaigns, 'amount_paid') + fromEntries(['advertising', 'sponsored_campaign']);
  const adsMonth = sumBy(partnerCampaigns, 'amount_paid', (c) => inThisMonth(c.created_at))
    + fromEntries(['advertising', 'sponsored_campaign'], true);

  const streams = [
    {
      id: 'marketplace_fee',
      label: 'Intermediação de vendas',
      description: 'Taxa da plataforma sobre pedidos pagos',
      origin: 'orders.platform_fee',
      total: sum(paid, 'platform_fee'),
      month: sum(inMonth, 'platform_fee'),
      active: paid.length > 0,
    },
    {
      id: 'subscriptions',
      label: 'Assinaturas Premium',
      description: 'Receita recorrente mensal dos assinantes ativos',
      origin: 'subscriptions + subscription_plans',
      total: fromEntries(['club_membership']) + mrr,
      month: mrr,
      active: activeSubs.length > 0,
    },
    {
      id: 'featured',
      label: 'Destaque e impulsionamento',
      description: 'Anúncios destacados pelos vendedores',
      origin: 'featured_products.price_paid',
      total: featuredTotal + fromEntries(['featured_listing']),
      month: sumBy(featuredRows, 'price_paid', (f) => inThisMonth(f.created_at))
        + fromEntries(['featured_listing'], true),
      active: featuredRows.length > 0,
    },
    {
      id: 'advertising',
      label: 'Publicidade e campanhas patrocinadas',
      description: 'Campanhas das empresas parceiras, inclusive geolocalizadas',
      origin: 'partner_campaigns.amount_paid + revenue_entries',
      total: adsTotal,
      month: adsMonth,
      active: partnerCampaigns.length > 0,
    },
    {
      id: 'club',
      label: 'Clube de Benefícios',
      description: 'Planos de participação das empresas parceiras',
      origin: 'revenue_entries.partner_plan',
      total: fromEntries(['partner_plan']),
      month: fromEntries(['partner_plan'], true),
      active: confirmedRevenue.some((r) => r.source === 'partner_plan'),
    },
    {
      id: 'ai_credits',
      label: 'Recursos avançados de IA',
      description: 'Créditos de geração de anúncios, vídeos e precificação',
      origin: 'revenue_entries.ai_credits',
      total: fromEntries(['ai_credits']),
      month: fromEntries(['ai_credits'], true),
      active: confirmedRevenue.some((r) => r.source === 'ai_credits'),
    },
    {
      id: 'financial_services',
      label: 'Serviços financeiros',
      description: 'Receitas do ecossistema de pagamentos (arquitetura preparada)',
      origin: 'revenue_entries.financial_services',
      total: fromEntries(['financial_services']),
      month: fromEntries(['financial_services'], true),
      active: confirmedRevenue.some((r) => r.source === 'financial_services'),
    },
  ];

  const totalRevenue = streams.reduce((acc, s) => acc + s.total, 0);
  const monthRevenue = streams.reduce((acc, s) => acc + s.month, 0);

  return NextResponse.json({
    finance: {
      streams: streams.map((s) => ({
        ...s,
        share: totalRevenue > 0 ? Number(((s.total / totalRevenue) * 100).toFixed(1)) : 0,
      })),
      totalRevenue,
      monthRevenue,
      // Custo transacional repassado ao gateway — abatido da receita bruta.
      gatewayCost: sum(paid, 'gateway_fee'),
      netRevenue: totalRevenue - sum(paid, 'gateway_fee'),
      pendingRevenue: sumBy(revenueEntries, 'net_value', (r) => r.status === 'pending'),
      activeStreams: streams.filter((s) => s.active).length,
      totalStreams: streams.length,
    },
    revenue: {
      gmvMonth,
      gmvTotal,
      growth,
      platformFee: sum(paid, 'platform_fee'),
      platformFeeMonth: sum(inMonth, 'platform_fee'),
      gatewayFee: sum(paid, 'gateway_fee'),
      commissions: sum(paid, 'reseller_commission_value'),
      donations: sum(paid, 'donation_value'),
      sellerPayouts: sum(paid, 'seller_net_value'),
      ticketMedio: paid.length ? gmvTotal / paid.length : 0,
      salesCount: paid.length,
      ordersCount: allOrders.length,
      // Conversão: pedidos pagos sobre o total de pedidos iniciados.
      conversionRate: allOrders.length ? (paid.length / allOrders.length) * 100 : 0,
      mrr,
      activeSubscribers: activeSubs.length,
      totalUsers: usersRes.count ?? 0,
      totalProducts: productsRes.count ?? 0,
    },
    daily: daily.map((d) => ({ ...d, bar: Math.round((d.value / maxDaily) * 100) })),
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      price_monthly: Number(p.price_monthly) || 0,
      features: Array.isArray(p.features) ? p.features : [],
      active: p.active !== false,
      subscribers: activeSubs.filter((s) => s.plan_id === p.id).length,
    })),
    coupons: (couponsRes.data ?? []).map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value) || 0,
      min_order_value: Number(c.min_order_value) || 0,
      max_discount: c.max_discount ? Number(c.max_discount) : null,
      usage_count: c.usage_count ?? 0,
      usage_limit: c.usage_limit ?? null,
      valid_until: c.valid_until,
      active: c.active !== false,
    })),
    featured: featuredRes.data ?? [],
    commissions: commissionsRes.data ?? [],
    reports: {
      daily: aggregate(
        paid,
        (d) => d.toISOString().slice(0, 10),
        (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ).slice(0, 10),
      monthly: aggregate(
        paid,
        (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        (d) => d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      ).slice(0, 12),
    },
  });
}
