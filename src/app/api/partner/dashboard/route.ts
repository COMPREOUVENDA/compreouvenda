import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requirePartner } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Portal do Parceiro — visão inicial da própria empresa.
 *
 * Escopo obrigatoriamente restrito ao `partner_id` do vínculo autenticado:
 * nenhuma query desta rota aceita `partner_id` vindo do cliente.
 *
 * Leitura é liberada mesmo para empresa em análise (`requireApproved = false`),
 * para que o parceiro acompanhe o andamento do cadastro.
 */
export async function GET(req: NextRequest) {
  const p = await requirePartner(req, 'operator', false);
  if (p instanceof NextResponse) return p;

  const db = getServiceClient();
  const partnerId = p.partnerId;

  const now = new Date();
  const from30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [partner, units, benefits, campaigns, redemptions, metrics, pendingDocs] = await Promise.all([
    db.from('partners')
      .select('id, legal_name, trade_name, tax_id, category, description, logo_url, status, plan, rating_avg, rating_count, review_notes, rejection_reason, created_at, approved_at')
      .eq('id', partnerId).single(),
    db.from('partner_units').select('id, name, city, state, is_active').eq('partner_id', partnerId),
    db.from('benefits').select('id, title, status, used_quantity, total_quantity, ends_at').eq('partner_id', partnerId),
    db.from('partner_campaigns').select('id, title, status, starts_at, ends_at').eq('partner_id', partnerId),
    db.from('benefit_redemptions')
      .select('id, status, unit_id, user_id, purchase_value, discount_applied, is_new_customer, created_at')
      .eq('partner_id', partnerId),
    db.from('campaign_metrics')
      .select('impressions, reach, clicks, conversions, campaign_id, partner_campaigns!inner(partner_id)')
      .eq('partner_campaigns.partner_id', partnerId),
    db.from('partner_documents').select('id, doc_type, status').eq('partner_id', partnerId).eq('status', 'pending'),
  ]);

  if (!partner.data) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  }

  const unitRows = units.data ?? [];
  const benefitRows = benefits.data ?? [];
  const campaignRows = campaigns.data ?? [];
  const redemptionRows = redemptions.data ?? [];
  const metricRows = metrics.data ?? [];

  const validated = redemptionRows.filter((r) => r.status === 'validated');
  const validated30 = validated.filter((r) => r.created_at >= from30);

  // Recorrência: usuários que voltaram mais de uma vez.
  const perUser = new Map<string, number>();
  for (const r of validated) {
    if (r.user_id) perUser.set(r.user_id, (perUser.get(r.user_id) ?? 0) + 1);
  }
  const returning = Array.from(perUser.values()).filter((n) => n > 1).length;

  // Impressões/alcance só existem quando o app instrumenta os eventos.
  // Sem linhas em `campaign_metrics`, devolvemos null — "sem medição" não é
  // a mesma informação que "zero desempenho".
  const hasMetrics = metricRows.length > 0;
  const sumMetric = (k: 'impressions' | 'reach' | 'clicks' | 'conversions') =>
    metricRows.reduce((a, m) => a + Number((m as Record<string, unknown>)[k] ?? 0), 0);

  const impressions = hasMetrics ? sumMetric('impressions') : null;
  const clicks = hasMetrics ? sumMetric('clicks') : null;

  // Desempenho por unidade, a partir das validações reais.
  const byUnit = unitRows.map((u) => {
    const rs = validated.filter((r) => r.unit_id === u.id);
    return {
      id: u.id,
      name: u.name,
      city: u.city,
      state: u.state,
      is_active: u.is_active,
      redemptions: rs.length,
      volume: rs.reduce((a, r) => a + Number(r.purchase_value ?? 0), 0),
    };
  }).sort((a, b) => b.redemptions - a.redemptions);

  return NextResponse.json({
    partner: partner.data,
    role: p.role,
    // O portal entra em modo somente leitura enquanto a empresa não é aprovada.
    canManage: p.partnerStatus === 'approved' && (p.role === 'owner' || p.role === 'manager'),
    kpis: {
      units: unitRows.length,
      activeUnits: unitRows.filter((u) => u.is_active).length,
      activeBenefits: benefitRows.filter((b) => b.status === 'approved').length,
      pendingBenefits: benefitRows.filter((b) => b.status === 'pending').length,
      activeCampaigns: campaignRows.filter((c) => c.status === 'active').length,
      pendingCampaigns: campaignRows.filter((c) => c.status === 'pending').length,
      redemptions: validated.length,
      redemptions30d: validated30.length,
      customers: perUser.size,
      newCustomers: validated.filter((r) => r.is_new_customer).length,
      returningCustomers: returning,
      volume: validated.reduce((a, r) => a + Number(r.purchase_value ?? 0), 0),
      discountGiven: validated.reduce((a, r) => a + Number(r.discount_applied ?? 0), 0),
      rating: Number(partner.data.rating_avg ?? 0),
      ratingCount: Number(partner.data.rating_count ?? 0),
      // null = ainda sem instrumentação de eventos
      impressions,
      reach: hasMetrics ? sumMetric('reach') : null,
      clicks,
      ctr: hasMetrics && impressions ? Number(((clicks! / impressions) * 100).toFixed(2)) : null,
    },
    units: byUnit,
    pendingDocuments: pendingDocs.data?.length ?? 0,
    // Pendências que dependem de ação do próprio parceiro.
    alerts: [
      p.partnerStatus === 'changes_requested' && {
        type: 'warning' as const,
        message: partner.data.review_notes || 'O administrador solicitou correções no cadastro.',
      },
      p.partnerStatus === 'pending' && {
        type: 'info' as const,
        message: 'Cadastro em análise. Você já pode preparar benefícios; a publicação ocorre após a aprovação.',
      },
      p.partnerStatus === 'rejected' && {
        type: 'error' as const,
        message: partner.data.rejection_reason || 'Cadastro rejeitado.',
      },
      p.partnerStatus === 'suspended' && {
        type: 'error' as const,
        message: 'Empresa suspensa. Entre em contato com o suporte.',
      },
      unitRows.length === 0 && {
        type: 'info' as const,
        message: 'Cadastre ao menos uma unidade para que seus benefícios apareçam no app.',
      },
    ].filter(Boolean),
  });
}
