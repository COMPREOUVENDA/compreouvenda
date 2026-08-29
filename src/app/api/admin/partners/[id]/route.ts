import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Visão 360° de um parceiro: cadastro, unidades, documentos, equipe,
 * benefícios, campanhas, utilizações, histórico e uso de IA.
 *
 * Consolidado numa única rota para que o administrador consiga analisar o
 * parceiro sem sair do contexto — requisito do Centro de Controle.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();
  const id = params.id;

  const { data: partner, error } = await db.from('partners').select('*').eq('id', id).maybeSingle();
  if (error) {
    return NextResponse.json({ error: `Erro ao carregar parceiro: ${error.message}` }, { status: 500 });
  }
  if (!partner) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  const [units, documents, members, benefits, campaigns, redemptions, history, aiLogs, revenues] =
    await Promise.all([
      db.from('partner_units').select('*').eq('partner_id', id).order('created_at'),
      db.from('partner_documents').select('*').eq('partner_id', id).order('created_at', { ascending: false }),
      db.from('partner_members').select('*').eq('partner_id', id),
      db.from('benefits').select('*').eq('partner_id', id).order('created_at', { ascending: false }),
      db.from('partner_campaigns').select('*').eq('partner_id', id).order('created_at', { ascending: false }),
      db.from('benefit_redemptions').select('*').eq('partner_id', id).order('created_at', { ascending: false }).limit(200),
      db.from('partner_status_history').select('*').eq('partner_id', id).order('created_at', { ascending: false }),
      db.from('partner_ai_logs').select('id, feature, accepted, tokens_used, created_at').eq('partner_id', id).order('created_at', { ascending: false }).limit(50),
      db.from('revenue_entries').select('id, source, gross_value, net_value, status, occurred_at').eq('partner_id', id).order('occurred_at', { ascending: false }).limit(100),
    ]);

  // Nomes legíveis: dono, equipe e quem alterou o status (consultas em lote).
  const userIds = Array.from(new Set([
    partner.owner_id,
    ...(members.data ?? []).map((m: any) => m.user_id),
  ].filter(Boolean))) as string[];

  const { data: users } = userIds.length
    ? await db.from('users').select('id, name, email, avatar_url').in('id', userIds)
    : { data: [] as any[] };
  const userMap = new Map((users ?? []).map((u: any) => [u.id, u]));

  const adminIds = Array.from(new Set(
    (history.data ?? []).map((h: any) => h.changed_by).filter(Boolean)
  )) as string[];
  const { data: admins } = adminIds.length
    ? await db.from('admin_users').select('id, name, email').in('id', adminIds)
    : { data: [] as any[] };
  const adminMap = new Map((admins ?? []).map((a: any) => [a.id, a]));

  const unitMap = new Map((units.data ?? []).map((u: any) => [u.id, u]));
  const benefitMap = new Map((benefits.data ?? []).map((b: any) => [b.id, b]));

  const validated = (redemptions.data ?? []).filter((r: any) => r.status === 'validated');
  const campaignIds = (campaigns.data ?? []).map((c: any) => c.id);
  const { data: metrics } = campaignIds.length
    ? await db.from('campaign_metrics').select('campaign_id, impressions, reach, clicks, conversions, revenue').in('campaign_id', campaignIds)
    : { data: [] as any[] };

  const sum = (arr: any[], k: string) => arr.reduce((t, x) => t + Number(x[k] ?? 0), 0);
  const metricRows = (metrics ?? []) as any[];

  return NextResponse.json({
    partner: {
      ...partner,
      owner: partner.owner_id ? userMap.get(partner.owner_id) ?? null : null,
    },
    units: units.data ?? [],
    documents: documents.data ?? [],
    members: (members.data ?? []).map((m: any) => ({
      ...m,
      user: userMap.get(m.user_id) ?? null,
      unit_name: m.unit_id ? unitMap.get(m.unit_id)?.name ?? null : null,
    })),
    benefits: benefits.data ?? [],
    campaigns: campaigns.data ?? [],
    redemptions: (redemptions.data ?? []).map((r: any) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      method: r.method,
      purchase_value: r.purchase_value,
      discount_applied: r.discount_applied,
      is_new_customer: r.is_new_customer,
      validated_at: r.validated_at,
      created_at: r.created_at,
      benefit_title: benefitMap.get(r.benefit_id)?.title ?? null,
      unit_name: r.unit_id ? unitMap.get(r.unit_id)?.name ?? null : null,
      // LGPD: nome do usuário não é exposto na listagem administrativa.
      has_user: !!r.user_id,
    })),
    history: (history.data ?? []).map((h: any) => ({
      ...h,
      changed_by_name: h.changed_by ? adminMap.get(h.changed_by)?.email ?? null : null,
    })),
    ai_logs: aiLogs.data ?? [],
    revenues: revenues.data ?? [],
    summary: {
      units_total: (units.data ?? []).length,
      units_active: (units.data ?? []).filter((u: any) => u.is_active).length,
      cities: Array.from(new Set((units.data ?? []).map((u: any) => `${u.city}/${u.state}`))),
      benefits_total: (benefits.data ?? []).length,
      benefits_approved: (benefits.data ?? []).filter((b: any) => b.status === 'approved').length,
      benefits_pending: (benefits.data ?? []).filter((b: any) => b.status === 'pending').length,
      campaigns_total: (campaigns.data ?? []).length,
      campaigns_active: (campaigns.data ?? []).filter((c: any) => c.status === 'active').length,
      redemptions_total: (redemptions.data ?? []).length,
      redemptions_validated: validated.length,
      unique_users: new Set(validated.map((r: any) => r.user_id).filter(Boolean)).size,
      new_customers: validated.filter((r: any) => r.is_new_customer).length,
      revenue_generated: sum(validated, 'purchase_value'),
      discount_granted: sum(validated, 'discount_applied'),
      platform_revenue: sum((revenues.data ?? []).filter((r: any) => r.status === 'confirmed'), 'net_value'),
      // Só existem quando o app instrumentar os eventos de exibição/clique.
      impressions: metricRows.length ? sum(metricRows, 'impressions') : null,
      clicks: metricRows.length ? sum(metricRows, 'clicks') : null,
      pending_documents: (documents.data ?? []).filter((d: any) => d.status === 'pending').length,
    },
  });
}
