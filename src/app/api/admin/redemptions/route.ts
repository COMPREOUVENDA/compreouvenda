import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Registros de validação de benefícios (QR Code, código ou manual).
 *
 * LGPD: a listagem NÃO expõe dados pessoais do usuário. O nome e o e-mail só
 * são retornados quando o administrador solicita explicitamente uma validação
 * específica (`?id=...&reveal=true`), e esse acesso é registrado em audit_logs.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const method = searchParams.get('method') ?? 'all';
  const partnerId = searchParams.get('partner_id') ?? '';
  const period = Math.min(Math.max(Number(searchParams.get('period') ?? 30), 1), 365);
  const revealId = searchParams.get('reveal') ?? '';

  // ─── Consulta pontual com dados pessoais (auditada) ───
  if (revealId) {
    const { data: row } = await db
      .from('benefit_redemptions')
      .select('id, user_id, benefit_id, partner_id')
      .eq('id', revealId)
      .maybeSingle();

    if (!row) return NextResponse.json({ error: 'Validação não encontrada' }, { status: 404 });
    if (!row.user_id) {
      return NextResponse.json({ user: null, reason: 'Validação sem usuário vinculado' });
    }

    const { data: user } = await db
      .from('users')
      .select('id, name, email, phone')
      .eq('id', row.user_id)
      .maybeSingle();

    await auditReveal(admin, revealId, row.partner_id);

    return NextResponse.json({
      user: user ?? null,
      notice: 'Este acesso a dados pessoais foi registrado nos logs de auditoria.',
    });
  }

  const since = new Date(Date.now() - period * 86400000).toISOString();

  let q = db
    .from('benefit_redemptions')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  if (status !== 'all') q = q.eq('status', status);
  if (method !== 'all') q = q.eq('method', method);
  if (partnerId) q = q.eq('partner_id', partnerId);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: `Erro ao carregar validações: ${error.message}` }, { status: 500 });
  }

  const list = (rows ?? []) as any[];
  const partnerIds = Array.from(new Set(list.map((r) => r.partner_id)));
  const benefitIds = Array.from(new Set(list.map((r) => r.benefit_id)));
  const unitIds = Array.from(new Set(list.map((r) => r.unit_id).filter(Boolean)));
  const campaignIds = Array.from(new Set(list.map((r) => r.campaign_id).filter(Boolean)));

  const [partnersRes, benefitsRes, unitsRes, campaignsRes] = await Promise.all([
    partnerIds.length ? db.from('partners').select('id, trade_name').in('id', partnerIds) : Promise.resolve({ data: [] as any[] }),
    benefitIds.length ? db.from('benefits').select('id, title').in('id', benefitIds) : Promise.resolve({ data: [] as any[] }),
    unitIds.length ? db.from('partner_units').select('id, name, city, state').in('id', unitIds) : Promise.resolve({ data: [] as any[] }),
    campaignIds.length ? db.from('partner_campaigns').select('id, title').in('id', campaignIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const pMap = new Map((partnersRes.data ?? []).map((x: any) => [x.id, x]));
  const bMap = new Map((benefitsRes.data ?? []).map((x: any) => [x.id, x]));
  const uMap = new Map((unitsRes.data ?? []).map((x: any) => [x.id, x]));
  const cMap = new Map((campaignsRes.data ?? []).map((x: any) => [x.id, x]));

  const redemptions = list.map((r) => {
    const u = r.unit_id ? uMap.get(r.unit_id) : null;
    return {
      id: r.id,
      code: r.code,
      method: r.method,
      status: r.status,
      partner_id: r.partner_id,
      partner_name: pMap.get(r.partner_id)?.trade_name ?? 'Parceiro removido',
      benefit_title: bMap.get(r.benefit_id)?.title ?? 'Benefício removido',
      unit_name: u?.name ?? null,
      unit_location: u ? `${u.city}/${u.state}` : null,
      campaign_title: r.campaign_id ? cMap.get(r.campaign_id)?.title ?? null : null,
      purchase_value: r.purchase_value,
      discount_applied: r.discount_applied,
      is_new_customer: r.is_new_customer,
      created_at: r.created_at,
      validated_at: r.validated_at,
      expires_at: r.expires_at,
      // LGPD: apenas a existência do vínculo, nunca a identidade.
      has_user: !!r.user_id,
    };
  });

  const validated = list.filter((r) => r.status === 'validated');
  const sum = (arr: any[], k: string) => arr.reduce((t, x) => t + Number(x[k] ?? 0), 0);

  return NextResponse.json({
    redemptions,
    kpis: {
      total: list.length,
      validated: validated.length,
      pending: list.filter((r) => r.status === 'pending').length,
      expired: list.filter((r) => r.status === 'expired').length,
      cancelled: list.filter((r) => r.status === 'cancelled').length,
      by_qr: list.filter((r) => r.method === 'qr_code').length,
      by_code: list.filter((r) => r.method === 'code').length,
      manual: list.filter((r) => r.method === 'manual').length,
      unique_users: new Set(list.map((r) => r.user_id).filter(Boolean)).size,
      volume: sum(validated, 'purchase_value'),
      discount_granted: sum(validated, 'discount_applied'),
      conversion_rate: list.length > 0
        ? Number(((validated.length / list.length) * 100).toFixed(1))
        : 0,
    },
  });
}

async function auditReveal(admin: AdminIdentity, redemptionId: string, partnerId: string) {
  try {
    await getServiceClient().from('audit_logs').insert({
      actor_id: admin.id,
      actor_email: admin.email,
      action: 'redemption_user_revealed',
      target_type: 'benefit_redemption',
      target_id: redemptionId,
      details: {
        partner_id: partnerId,
        reason: 'Consulta administrativa de dados pessoais em validação de benefício',
        lgpd: true,
      },
    });
  } catch {
    // auditoria nunca bloqueia a operação principal
  }
}
