import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Métricas consolidadas do Clube de Benefícios.
 *
 * Filtros aceitos: period (dias), city, state, category, partner_id, unit_id.
 * Indicadores derivados de eventos reais (benefit_redemptions). Métricas de
 * exibição de campanha só aparecem quando `campaign_metrics` tiver registros —
 * caso contrário retornam null para não simular desempenho inexistente.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const period = Math.min(Math.max(Number(searchParams.get('period') ?? 30), 1), 365);
  const city = searchParams.get('city') ?? '';
  const state = searchParams.get('state') ?? '';
  const category = searchParams.get('category') ?? '';
  const partnerId = searchParams.get('partner_id') ?? '';
  const unitId = searchParams.get('unit_id') ?? '';

  const since = new Date(Date.now() - period * 86400000).toISOString();
  const prevSince = new Date(Date.now() - period * 2 * 86400000).toISOString();

  const [partnersRes, unitsRes, benefitsRes, redemRes, campaignsRes, metricsRes] = await Promise.all([
    db.from('partners').select('id, trade_name, category, status, created_at'),
    db.from('partner_units').select('id, partner_id, city, state, is_active'),
    db.from('benefits').select('id, partner_id, title, status, category, used_quantity, created_at'),
    db.from('benefit_redemptions').select('id, benefit_id, partner_id, unit_id, user_id, campaign_id, status, purchase_value, discount_applied, is_new_customer, validated_at, created_at'),
    db.from('partner_campaigns').select('id, partner_id, title, status, campaign_type, amount_paid'),
    db.from('campaign_metrics').select('campaign_id, impressions, reach, clicks, conversions, revenue, metric_date'),
  ]);

  const partners = (partnersRes.data ?? []) as any[];
  const units = (unitsRes.data ?? []) as any[];
  const benefits = (benefitsRes.data ?? []) as any[];
  const campaigns = (campaignsRes.data ?? []) as any[];
  const metrics = (metricsRes.data ?? []) as any[];
  let redemptions = (redemRes.data ?? []) as any[];

  // ─── Aplicação dos filtros ───
  const unitMap = new Map(units.map((u) => [u.id, u]));
  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  let partnerScope = partners;
  if (category) partnerScope = partnerScope.filter((p) => p.category === category);
  if (partnerId) partnerScope = partnerScope.filter((p) => p.id === partnerId);
  const partnerScopeIds = new Set(partnerScope.map((p) => p.id));

  let unitScope = units.filter((u) => partnerScopeIds.has(u.partner_id));
  if (city) unitScope = unitScope.filter((u) => u.city?.toLowerCase() === city.toLowerCase());
  if (state) unitScope = unitScope.filter((u) => u.state?.toUpperCase() === state.toUpperCase());
  if (unitId) unitScope = unitScope.filter((u) => u.id === unitId);
  const unitScopeIds = new Set(unitScope.map((u) => u.id));

  const geoFiltered = !!(city || state || unitId);
  redemptions = redemptions.filter((r) => {
    if (!partnerScopeIds.has(r.partner_id)) return false;
    if (geoFiltered) return r.unit_id ? unitScopeIds.has(r.unit_id) : false;
    return true;
  });

  const inPeriod = (r: any) => (r.validated_at ?? r.created_at) >= since;
  const inPrev = (r: any) => {
    const d = r.validated_at ?? r.created_at;
    return d >= prevSince && d < since;
  };

  const validated = redemptions.filter((r) => r.status === 'validated');
  const current = validated.filter(inPeriod);
  const previous = validated.filter(inPrev);

  const sum = (arr: any[], k: string) => arr.reduce((t, x) => t + Number(x[k] ?? 0), 0);
  const growth = (now: number, before: number) =>
    before === 0 ? (now > 0 ? 100 : 0) : Number((((now - before) / before) * 100).toFixed(1));

  // ─── Recorrência: usuários com mais de uma utilização no período ───
  const usageByUser = new Map<string, number>();
  current.forEach((r) => {
    if (!r.user_id) return;
    usageByUser.set(r.user_id, (usageByUser.get(r.user_id) ?? 0) + 1);
  });
  const uniqueUsers = usageByUser.size;
  const recurringUsers = Array.from(usageByUser.values()).filter((n) => n > 1).length;

  // ─── Rankings ───
  const rank = (map: Map<string, { label: string; count: number; volume: number }>) =>
    Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  const byCategory = new Map<string, { label: string; count: number; volume: number }>();
  const byCity = new Map<string, { label: string; count: number; volume: number }>();
  const byPartner = new Map<string, { label: string; count: number; volume: number }>();
  const byBenefit = new Map<string, { label: string; count: number; volume: number }>();

  const benefitMap = new Map(benefits.map((b) => [b.id, b]));

  current.forEach((r) => {
    const p = partnerMap.get(r.partner_id);
    const u = r.unit_id ? unitMap.get(r.unit_id) : null;
    const b = benefitMap.get(r.benefit_id);
    const vol = Number(r.purchase_value ?? 0);

    const cat = p?.category ?? 'Sem categoria';
    const catEntry = byCategory.get(cat) ?? { label: cat, count: 0, volume: 0 };
    byCategory.set(cat, { ...catEntry, count: catEntry.count + 1, volume: catEntry.volume + vol });

    if (u) {
      const key = `${u.city}/${u.state}`;
      const e = byCity.get(key) ?? { label: key, count: 0, volume: 0 };
      byCity.set(key, { ...e, count: e.count + 1, volume: e.volume + vol });
    }

    if (p) {
      const e = byPartner.get(p.id) ?? { label: p.trade_name, count: 0, volume: 0 };
      byPartner.set(p.id, { ...e, count: e.count + 1, volume: e.volume + vol });
    }

    if (b) {
      const e = byBenefit.get(b.id) ?? { label: b.title, count: 0, volume: 0 };
      byBenefit.set(b.id, { ...e, count: e.count + 1, volume: e.volume + vol });
    }
  });

  // ─── Campanhas com melhor desempenho ───
  const campaignScope = campaigns.filter((c) => partnerScopeIds.has(c.partner_id));
  const topCampaigns = campaignScope
    .map((c) => {
      const my = metrics.filter((m) => m.campaign_id === c.id && m.metric_date >= since.slice(0, 10));
      const red = current.filter((r) => r.campaign_id === c.id);
      const impressions = my.length ? sum(my, 'impressions') : null;
      const clicks = my.length ? sum(my, 'clicks') : null;
      return {
        id: c.id,
        title: c.title,
        partner_name: partnerMap.get(c.partner_id)?.trade_name ?? '—',
        type: c.campaign_type,
        status: c.status,
        impressions,
        clicks,
        ctr: impressions && impressions > 0 && clicks !== null
          ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
        redemptions: red.length,
        volume: sum(red, 'purchase_value'),
      };
    })
    .sort((a, b) => b.redemptions - a.redemptions || (b.impressions ?? 0) - (a.impressions ?? 0))
    .slice(0, 10);

  // ─── Série diária de utilizações ───
  const series: { date: string; redemptions: number; volume: number; new_customers: number }[] = [];
  const days = Math.min(period, 90);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const day = current.filter((r) => (r.validated_at ?? r.created_at).slice(0, 10) === d);
    series.push({
      date: d,
      redemptions: day.length,
      volume: sum(day, 'purchase_value'),
      new_customers: day.filter((r) => r.is_new_customer).length,
    });
  }

  const activePartners = partnerScope.filter((p) => p.status === 'approved');
  const newPartners = partnerScope.filter((p) => p.created_at >= since);
  const scopedBenefits = benefits.filter((b) => partnerScopeIds.has(b.partner_id));
  const hasDisplayMetrics = metrics.length > 0;

  return NextResponse.json({
    filters: {
      period, city, state, category, partner_id: partnerId, unit_id: unitId,
      available: {
        categories: Array.from(new Set(partners.map((p) => p.category).filter(Boolean))).sort(),
        cities: Array.from(new Set(units.map((u) => u.city).filter(Boolean))).sort(),
        states: Array.from(new Set(units.map((u) => u.state).filter(Boolean))).sort(),
        partners: partners
          .filter((p) => p.status === 'approved')
          .map((p) => ({ id: p.id, name: p.trade_name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      },
    },
    kpis: {
      active_partners: activePartners.length,
      total_partners: partnerScope.length,
      pending_partners: partnerScope.filter((p) => p.status === 'pending').length,
      new_partners: newPartners.length,
      total_units: unitScope.length,
      active_units: unitScope.filter((u) => u.is_active).length,
      published_benefits: scopedBenefits.filter((b) => b.status === 'approved').length,
      pending_benefits: scopedBenefits.filter((b) => b.status === 'pending').length,
      redemptions: current.length,
      redemptions_growth: growth(current.length, previous.length),
      unique_users: uniqueUsers,
      recurring_users: recurringUsers,
      recurrence_rate: uniqueUsers > 0 ? Number(((recurringUsers / uniqueUsers) * 100).toFixed(1)) : 0,
      avg_uses_per_user: uniqueUsers > 0 ? Number((current.length / uniqueUsers).toFixed(2)) : 0,
      new_customers: current.filter((r) => r.is_new_customer).length,
      volume: sum(current, 'purchase_value'),
      volume_growth: growth(sum(current, 'purchase_value'), sum(previous, 'purchase_value')),
      discount_granted: sum(current, 'discount_applied'),
      avg_ticket: current.length > 0 ? Number((sum(current, 'purchase_value') / current.length).toFixed(2)) : 0,
      active_campaigns: campaignScope.filter((c) => c.status === 'active').length,
      ad_revenue: sum(campaignScope, 'amount_paid'),
      // null quando não há instrumentação de exibição registrada
      impressions: hasDisplayMetrics ? sum(metrics, 'impressions') : null,
      clicks: hasDisplayMetrics ? sum(metrics, 'clicks') : null,
    },
    top_categories: rank(byCategory),
    top_cities: rank(byCity),
    top_partners: rank(byPartner),
    top_benefits: rank(byBenefit),
    top_campaigns: topCampaigns,
    series,
    has_display_metrics: hasDisplayMetrics,
  });
}
