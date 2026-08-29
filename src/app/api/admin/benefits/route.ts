import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ACTIONS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  pause: 'paused',
  resume: 'approved',
};

async function audit(admin: AdminIdentity, action: string, targetId: string, details: unknown) {
  try {
    await getServiceClient().from('audit_logs').insert({
      actor_id: admin.id,
      actor_email: admin.email,
      action,
      target_type: 'benefit',
      target_id: targetId,
      details,
    });
  } catch {
    // auditoria nunca bloqueia a operação principal
  }
}

/** Um benefício está vigente hoje? Usado para diferenciar "aprovado" de "no ar". */
function isLive(b: any): boolean {
  if (b.status !== 'approved') return false;
  const now = Date.now();
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
  if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
  if (b.total_quantity !== null && b.used_quantity >= b.total_quantity) return false;
  return true;
}

// ─── GET: benefícios com dados do parceiro e utilização real ────────────────
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const partnerId = searchParams.get('partner_id') ?? '';
  const search = searchParams.get('search')?.trim() ?? '';

  let q = db.from('benefits').select('*').order('created_at', { ascending: false }).limit(300);
  if (status !== 'all') q = q.eq('status', status);
  if (partnerId) q = q.eq('partner_id', partnerId);
  if (search) q = q.ilike('title', `%${search}%`);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: `Erro ao carregar benefícios: ${error.message}` }, { status: 500 });
  }

  const list = (rows ?? []) as any[];
  const partnerIds = Array.from(new Set(list.map((b) => b.partner_id)));
  const benefitIds = list.map((b) => b.id);

  const [partnersRes, redemRes, unitsRes] = await Promise.all([
    partnerIds.length
      ? db.from('partners').select('id, trade_name, category, status, logo_url').in('id', partnerIds)
      : Promise.resolve({ data: [] as any[] }),
    benefitIds.length
      ? db.from('benefit_redemptions').select('benefit_id, status, user_id, purchase_value, discount_applied, is_new_customer').in('benefit_id', benefitIds)
      : Promise.resolve({ data: [] as any[] }),
    benefitIds.length
      ? db.from('benefit_units').select('benefit_id, unit_id').in('benefit_id', benefitIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const partnerMap = new Map((partnersRes.data ?? []).map((p: any) => [p.id, p]));
  const redemptions = (redemRes.data ?? []) as any[];
  const benefitUnits = (unitsRes.data ?? []) as any[];

  const benefits = list.map((b) => {
    const mine = redemptions.filter((r) => r.benefit_id === b.id);
    const validated = mine.filter((r) => r.status === 'validated');
    const p = partnerMap.get(b.partner_id);

    return {
      ...b,
      partner_name: p?.trade_name ?? 'Parceiro removido',
      partner_category: p?.category ?? null,
      partner_status: p?.status ?? null,
      partner_logo: p?.logo_url ?? null,
      units_count: benefitUnits.filter((u) => u.benefit_id === b.id).length,
      redemptions_total: mine.length,
      redemptions_validated: validated.length,
      unique_users: new Set(validated.map((r) => r.user_id).filter(Boolean)).size,
      new_customers: validated.filter((r) => r.is_new_customer).length,
      volume: validated.reduce((t, r) => t + Number(r.purchase_value ?? 0), 0),
      discount_granted: validated.reduce((t, r) => t + Number(r.discount_applied ?? 0), 0),
      is_live: isLive(b),
      // Benefício aprovado mas cujo parceiro não está aprovado não aparece no app.
      blocked_by_partner: b.status === 'approved' && p?.status !== 'approved',
    };
  });

  const { data: allStatus } = await db.from('benefits').select('status');
  const statusRows = (allStatus ?? []) as any[];
  const counts = ['draft', 'pending', 'approved', 'rejected', 'paused', 'expired'].reduce<Record<string, number>>(
    (acc, s) => { acc[s] = statusRows.filter((r) => r.status === s).length; return acc; },
    {}
  );

  return NextResponse.json({
    benefits,
    kpis: {
      total: statusRows.length,
      ...counts,
      live: benefits.filter((b) => b.is_live).length,
      blocked: benefits.filter((b) => b.blocked_by_partner).length,
    },
  });
}

// ─── PATCH: aprovar / rejeitar / pausar / retomar ───────────────────────────
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');

  if (!id) return NextResponse.json({ error: 'ID do benefício é obrigatório' }, { status: 400 });

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
    .from('benefits')
    .select('id, status, title, partner_id')
    .eq('id', id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: 'Benefício não encontrado' }, { status: 404 });
  if (current.status === target) {
    return NextResponse.json({ error: `O benefício já está com status "${target}"` }, { status: 409 });
  }

  // Um benefício só pode ir ao ar se a empresa parceira estiver aprovada.
  if (action === 'approve' || action === 'resume') {
    const { data: partner } = await db
      .from('partners')
      .select('status, trade_name')
      .eq('id', current.partner_id)
      .maybeSingle();

    if (!partner || partner.status !== 'approved') {
      return NextResponse.json(
        {
          error: `O parceiro "${partner?.trade_name ?? 'desconhecido'}" não está aprovado (${partner?.status ?? 'inexistente'}). Aprove a empresa antes de liberar o benefício.`,
        },
        { status: 409 }
      );
    }
  }

  const patch: Record<string, unknown> = {
    status: target,
    updated_at: new Date().toISOString(),
  };

  if (action === 'approve' || action === 'resume') {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = admin.id;
    patch.rejection_reason = null;
  }
  if (action === 'reject') patch.rejection_reason = reason;

  const { data, error } = await db.from('benefits').update(patch).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: `Erro ao atualizar benefício: ${error.message}` }, { status: 500 });
  }

  await audit(admin, `benefit_${action}`, id, {
    from: current.status, to: target, title: current.title, reason: reason || null, by: admin.email,
  });

  return NextResponse.json({ benefit: data });
}
