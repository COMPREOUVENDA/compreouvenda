import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ACTIONS: Record<string, string> = {
  approve: 'active',
  reject: 'rejected',
  pause: 'paused',
  resume: 'active',
  finish: 'finished',
};

async function audit(admin: AdminIdentity, action: string, targetId: string, details: unknown) {
  try {
    await getServiceClient().from('audit_logs').insert({
      actor_id: admin.id,
      actor_email: admin.email,
      action,
      target_type: 'campaign',
      target_id: targetId,
      details,
    });
  } catch {
    // auditoria nunca bloqueia a operação principal
  }
}

// ─── GET: campanhas + métricas observadas ───────────────────────────────────
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const type = searchParams.get('type') ?? 'all';
  const partnerId = searchParams.get('partner_id') ?? '';

  let q = db.from('partner_campaigns').select('*').order('created_at', { ascending: false }).limit(300);
  if (status !== 'all') q = q.eq('status', status);
  if (type !== 'all') q = q.eq('campaign_type', type);
  if (partnerId) q = q.eq('partner_id', partnerId);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: `Erro ao carregar campanhas: ${error.message}` }, { status: 500 });
  }

  const list = (rows ?? []) as any[];
  const ids = list.map((c) => c.id);
  const partnerIds = Array.from(new Set(list.map((c) => c.partner_id)));
  const benefitIds = Array.from(new Set(list.map((c) => c.benefit_id).filter(Boolean)));

  const [metricsRes, partnersRes, benefitsRes, redemRes] = await Promise.all([
    ids.length
      ? db.from('campaign_metrics').select('*').in('campaign_id', ids)
      : Promise.resolve({ data: [] as any[] }),
    partnerIds.length
      ? db.from('partners').select('id, trade_name, status').in('id', partnerIds)
      : Promise.resolve({ data: [] as any[] }),
    benefitIds.length
      ? db.from('benefits').select('id, title').in('id', benefitIds)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? db.from('benefit_redemptions').select('campaign_id, status, purchase_value').in('campaign_id', ids)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const metrics = (metricsRes.data ?? []) as any[];
  const partnerMap = new Map((partnersRes.data ?? []).map((p: any) => [p.id, p]));
  const benefitMap = new Map((benefitsRes.data ?? []).map((b: any) => [b.id, b]));
  const redemptions = (redemRes.data ?? []) as any[];

  const sum = (arr: any[], k: string) => arr.reduce((t, x) => t + Number(x[k] ?? 0), 0);

  const campaigns = list.map((c) => {
    const my = metrics.filter((m) => m.campaign_id === c.id);
    const validated = redemptions.filter((r) => r.campaign_id === c.id && r.status === 'validated');
    const impressions = my.length ? sum(my, 'impressions') : null;
    const clicks = my.length ? sum(my, 'clicks') : null;

    return {
      ...c,
      partner_name: partnerMap.get(c.partner_id)?.trade_name ?? 'Parceiro removido',
      partner_status: partnerMap.get(c.partner_id)?.status ?? null,
      benefit_title: c.benefit_id ? benefitMap.get(c.benefit_id)?.title ?? null : null,
      // null = evento ainda não instrumentado no app; 0 seria uma afirmação falsa.
      impressions,
      reach: my.length ? sum(my, 'reach') : null,
      clicks,
      ctr: impressions && impressions > 0 && clicks !== null
        ? Number(((clicks / impressions) * 100).toFixed(2))
        : null,
      conversions: my.length ? sum(my, 'conversions') : null,
      attributed_revenue: my.length ? sum(my, 'revenue') : null,
      // Estes vêm das validações reais, independem de instrumentação de exibição.
      redemptions: validated.length,
      redemption_volume: sum(validated, 'purchase_value'),
      has_metrics: my.length > 0,
    };
  });

  const { data: allRows } = await db.from('partner_campaigns').select('status, campaign_type, amount_paid');
  const statusRows = (allRows ?? []) as any[];
  const counts = ['draft', 'pending', 'active', 'paused', 'finished', 'rejected'].reduce<Record<string, number>>(
    (acc, s) => { acc[s] = statusRows.filter((r) => r.status === s).length; return acc; },
    {}
  );

  return NextResponse.json({
    campaigns,
    kpis: {
      total: statusRows.length,
      ...counts,
      revenue: sum(statusRows, 'amount_paid'),
      // Quantas campanhas já possuem qualquer métrica de exibição registrada.
      instrumented: campaigns.filter((c) => c.has_metrics).length,
    },
  });
}

// ─── PATCH: aprovar / rejeitar / pausar / retomar / encerrar ────────────────
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');

  if (!id) return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 });

  const target = ACTIONS[action];
  if (!target) {
    return NextResponse.json(
      { error: `Ação inválida. Use: ${Object.keys(ACTIONS).join(', ')}` },
      { status: 400 }
    );
  }

  const reason = String(body.reason ?? '').trim();
  if (action === 'reject' && !reason) {
    return NextResponse.json({ error: 'Informe o motivo da rejeição' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: current } = await db
    .from('partner_campaigns')
    .select('id, status, title, partner_id')
    .eq('id', id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  if (current.status === target) {
    return NextResponse.json({ error: `A campanha já está com status "${target}"` }, { status: 409 });
  }

  // Publicidade só vai ao ar com a empresa aprovada.
  if (action === 'approve' || action === 'resume') {
    const { data: partner } = await db
      .from('partners')
      .select('status, trade_name')
      .eq('id', current.partner_id)
      .maybeSingle();

    if (!partner || partner.status !== 'approved') {
      return NextResponse.json(
        {
          error: `O parceiro "${partner?.trade_name ?? 'desconhecido'}" não está aprovado (${partner?.status ?? 'inexistente'}). Aprove a empresa antes de veicular a campanha.`,
        },
        { status: 409 }
      );
    }
  }

  const patch: Record<string, unknown> = { status: target, updated_at: new Date().toISOString() };
  if (action === 'approve' || action === 'resume') {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = admin.id;
    patch.rejection_reason = null;
  }
  if (action === 'reject') patch.rejection_reason = reason;
  if (body.priority !== undefined) {
    const p = Number(body.priority);
    if (!Number.isInteger(p) || p < 0 || p > 100) {
      return NextResponse.json({ error: 'Prioridade deve ser um inteiro entre 0 e 100' }, { status: 400 });
    }
    patch.priority = p;
  }

  const { data, error } = await db.from('partner_campaigns').update(patch).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: `Erro ao atualizar campanha: ${error.message}` }, { status: 500 });
  }

  await audit(admin, `campaign_${action}`, id, {
    from: current.status, to: target, title: current.title, reason: reason || null, by: admin.email,
  });

  return NextResponse.json({ campaign: data });
}
