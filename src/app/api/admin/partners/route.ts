import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, isValidTaxId, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'approved', 'rejected', 'suspended', 'inactive', 'changes_requested'] as const;
const PLANS = ['free', 'basic', 'premium', 'enterprise'] as const;

/** Ações administrativas sobre o cadastro do parceiro. */
const ACTIONS: Record<string, (typeof STATUSES)[number]> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  reactivate: 'approved',
  deactivate: 'inactive',
  request_changes: 'changes_requested',
};

async function audit(admin: AdminIdentity, action: string, targetId: string, details: unknown) {
  try {
    await getServiceClient().from('audit_logs').insert({
      actor_id: admin.id,
      actor_email: admin.email,
      action,
      target_type: 'partner',
      target_id: targetId,
      details,
    });
  } catch {
    // auditoria nunca bloqueia a operação principal
  }
}

// ─── GET: lista de parceiros + KPIs do clube ────────────────────────────────
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';
  const category = searchParams.get('category') ?? 'all';
  const city = searchParams.get('city') ?? '';
  const search = searchParams.get('search')?.trim() ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 200);

  let q = db
    .from('partners')
    .select('id, legal_name, trade_name, tax_id, category, status, plan, logo_url, email, phone, rating_avg, rating_count, created_at, approved_at, owner_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') q = q.eq('status', status);
  if (category !== 'all') q = q.eq('category', category);
  if (search) {
    const like = `%${search}%`;
    q = q.or(`trade_name.ilike.${like},legal_name.ilike.${like},tax_id.ilike.${like},email.ilike.${like}`);
  }

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: `Erro ao carregar parceiros: ${error.message}` }, { status: 500 });
  }

  const ids = (rows ?? []).map((p) => p.id as string);

  // Agregações por parceiro — consultas em lote, sem N+1.
  const [unitsRes, benefitsRes, campaignsRes, redemptionsRes] = await Promise.all([
    ids.length
      ? db.from('partner_units').select('id, partner_id, city, state, is_active').in('partner_id', ids)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? db.from('benefits').select('id, partner_id, status').in('partner_id', ids)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? db.from('partner_campaigns').select('id, partner_id, status').in('partner_id', ids)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? db.from('benefit_redemptions').select('id, partner_id, status, user_id, is_new_customer').in('partner_id', ids)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const units = (unitsRes.data ?? []) as any[];
  const benefits = (benefitsRes.data ?? []) as any[];
  const campaigns = (campaignsRes.data ?? []) as any[];
  const redemptions = (redemptionsRes.data ?? []) as any[];

  const partners = (rows ?? []).map((p: any) => {
    const myUnits = units.filter((u) => u.partner_id === p.id);
    const myBenefits = benefits.filter((b) => b.partner_id === p.id);
    const myRedem = redemptions.filter((r) => r.partner_id === p.id && r.status === 'validated');
    const cities = Array.from(new Set(myUnits.map((u) => `${u.city}/${u.state}`)));

    return {
      id: p.id,
      legal_name: p.legal_name,
      trade_name: p.trade_name,
      tax_id: p.tax_id,
      category: p.category,
      status: p.status,
      plan: p.plan,
      logo_url: p.logo_url,
      email: p.email,
      phone: p.phone,
      rating_avg: Number(p.rating_avg ?? 0),
      rating_count: p.rating_count ?? 0,
      created_at: p.created_at,
      approved_at: p.approved_at,
      units_count: myUnits.length,
      active_units: myUnits.filter((u) => u.is_active).length,
      cities,
      benefits_total: myBenefits.length,
      benefits_active: myBenefits.filter((b) => b.status === 'approved').length,
      benefits_pending: myBenefits.filter((b) => b.status === 'pending').length,
      campaigns_active: campaigns.filter((c) => c.partner_id === p.id && c.status === 'active').length,
      redemptions: myRedem.length,
      unique_users: new Set(myRedem.map((r) => r.user_id).filter(Boolean)).size,
      new_customers: myRedem.filter((r) => r.is_new_customer).length,
    };
  });

  // KPIs globais do clube (independentes do filtro aplicado na listagem)
  const { data: allStatus } = await db.from('partners').select('status, category');
  const statusList = (allStatus ?? []) as any[];
  const byStatus = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = statusList.filter((p) => p.status === s).length;
    return acc;
  }, {});

  const categoriesSet = Array.from(new Set(statusList.map((p) => p.category).filter(Boolean))).sort();

  const [{ count: benefitsApproved }, { count: benefitsPending }, { count: redemTotal }] = await Promise.all([
    db.from('benefits').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('benefits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('benefit_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'validated'),
  ]);

  return NextResponse.json({
    partners: city
      ? partners.filter((p) => p.cities.some((c) => c.toLowerCase().includes(city.toLowerCase())))
      : partners,
    categories: categoriesSet,
    kpis: {
      total: statusList.length,
      ...byStatus,
      benefits_approved: benefitsApproved ?? 0,
      benefits_pending: benefitsPending ?? 0,
      redemptions: redemTotal ?? 0,
    },
  });
}

// ─── POST: cadastro manual de parceiro pelo administrador ───────────────────
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req, ['admin_operational']);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const legal_name = String(body.legal_name ?? '').trim();
  const trade_name = String(body.trade_name ?? '').trim();
  const tax_id = String(body.tax_id ?? '').replace(/\D/g, '');
  const category = String(body.category ?? '').trim();

  if (!legal_name || !trade_name) {
    return NextResponse.json({ error: 'Razão social e nome fantasia são obrigatórios' }, { status: 400 });
  }
  if (!isValidTaxId(tax_id)) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 });
  }

  const db = getServiceClient();

  // Responsável opcional: quando informado, já sai do cadastro com acesso ao
  // Portal do Parceiro. Sem isso, a empresa nasce sem ninguém que consiga
  // entrar no portal — situação que a aba "Equipe" sinaliza depois.
  let owner: { id: string; name: string | null; email: string } | null = null;
  const ownerEmail = String(body.owner_email ?? '').trim().toLowerCase();

  if (ownerEmail) {
    const { data: found } = await db
      .from('users').select('id, name, email').ilike('email', ownerEmail).maybeSingle();
    if (!found) {
      return NextResponse.json(
        {
          error: `Nenhuma conta encontrada para ${ownerEmail}. A pessoa precisa se cadastrar no COMPREOUVENDA antes de ser vinculada como responsável.`,
          code: 'owner_not_found',
        },
        { status: 404 }
      );
    }

    const { data: linked } = await db
      .from('partner_members')
      .select('partner:partners(trade_name)')
      .eq('user_id', found.id)
      .eq('is_active', true)
      .maybeSingle();

    if (linked) {
      const p = Array.isArray(linked.partner) ? linked.partner[0] : linked.partner;
      return NextResponse.json(
        {
          error: `Esta conta já é responsável pela empresa "${p?.trade_name ?? 'outra empresa'}". Revogue o acesso anterior antes de vinculá-la aqui.`,
          code: 'already_linked',
        },
        { status: 409 }
      );
    }

    owner = found;
  }

  const { data: dup } = await db.from('partners').select('id, trade_name').eq('tax_id', tax_id).maybeSingle();
  if (dup) {
    return NextResponse.json(
      { error: `Já existe um parceiro cadastrado com este CNPJ: ${dup.trade_name}` },
      { status: 409 }
    );
  }

  const { data, error } = await db
    .from('partners')
    .insert({
      legal_name,
      trade_name,
      tax_id,
      category,
      description: body.description ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      instagram: body.instagram ?? null,
      plan: PLANS.includes(body.plan) ? body.plan : 'free',
      status: 'pending',
      owner_id: owner?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Erro ao cadastrar parceiro: ${error.message}` }, { status: 500 });
  }

  // O vínculo em `partner_members` é o que efetivamente abre o portal;
  // `owner_id` sozinho apenas registra quem responde pela empresa.
  if (owner) {
    await db.from('partner_members').insert({
      partner_id: data.id,
      user_id: owner.id,
      role: 'owner',
      is_active: true,
    });
  }

  await audit(admin, 'partner_created', data.id, {
    trade_name,
    tax_id,
    owner_email: owner?.email ?? null,
    by: admin.email,
  });

  return NextResponse.json(
    {
      partner: data,
      message: owner
        ? `Parceiro cadastrado. ${owner.name || owner.email} já tem acesso ao Portal do Parceiro como responsável.`
        : 'Parceiro cadastrado. Nenhuma conta tem acesso ao portal ainda — conceda o acesso na aba "Equipe".',
    },
    { status: 201 }
  );
}

// ─── PATCH: aprovar / rejeitar / suspender / reativar / plano ───────────────
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'ID do parceiro é obrigatório' }, { status: 400 });

  const db = getServiceClient();
  const { data: current } = await db
    .from('partners')
    .select('id, status, trade_name, plan, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let actionName = 'partner_updated';

  if (body.action) {
    const target = ACTIONS[String(body.action)];
    if (!target) {
      return NextResponse.json(
        { error: `Ação inválida. Use: ${Object.keys(ACTIONS).join(', ')}` },
        { status: 400 }
      );
    }

    const reason = String(body.reason ?? '').trim();
    if ((body.action === 'reject' || body.action === 'suspend' || body.action === 'request_changes') && !reason) {
      return NextResponse.json(
        { error: 'Informe o motivo para rejeitar, suspender ou solicitar correções' },
        { status: 400 }
      );
    }

    if (current.status === target && body.action !== 'request_changes') {
      return NextResponse.json(
        { error: `O parceiro já está com status "${target}"` },
        { status: 409 }
      );
    }

    patch.status = target;
    patch.approved_by = admin.id;
    actionName = `partner_${body.action}`;

    if (body.action === 'approve' || body.action === 'reactivate') {
      patch.approved_at = new Date().toISOString();
      patch.rejection_reason = null;
    }
    if (body.action === 'reject' || body.action === 'suspend') {
      patch.rejection_reason = reason;
    }
    if (body.action === 'request_changes') {
      patch.review_notes = reason;
    }
  }

  if (body.plan !== undefined) {
    if (!PLANS.includes(body.plan)) {
      return NextResponse.json({ error: `Plano inválido. Use: ${PLANS.join(', ')}` }, { status: 400 });
    }
    patch.plan = body.plan;
  }

  for (const f of ['legal_name', 'trade_name', 'category', 'description', 'email', 'phone', 'website', 'instagram', 'review_notes'] as const) {
    if (body[f] !== undefined) patch[f] = body[f];
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 });
  }

  const { data, error } = await db.from('partners').update(patch).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: `Erro ao atualizar parceiro: ${error.message}` }, { status: 500 });
  }

  await audit(admin, actionName, id, {
    from: current.status,
    to: patch.status ?? current.status,
    reason: body.reason ?? null,
    by: admin.email,
  });

  // Aprovar uma empresa sem ninguém vinculado a deixaria aprovada e
  // inacessível. Quando há um responsável de registro, promovemos o vínculo
  // automaticamente; quando não há, devolvemos o aviso para o administrador
  // resolver na aba "Equipe".
  let accessWarning: string | null = null;

  if (body.action === 'approve' || body.action === 'reactivate') {
    const { count } = await db
      .from('partner_members')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', id)
      .eq('is_active', true);

    if ((count ?? 0) === 0) {
      if (current.owner_id) {
        await db.from('partner_members').upsert(
          { partner_id: id, user_id: current.owner_id, role: 'owner', is_active: true },
          { onConflict: 'partner_id,user_id' }
        );
        await audit(admin, 'partner_access_granted', id, {
          reason: 'vínculo do responsável criado automaticamente na aprovação',
          user_id: current.owner_id,
          role: 'owner',
          by: admin.email,
        });
        accessWarning = 'O responsável de registro foi vinculado automaticamente e já pode acessar o Portal do Parceiro.';
      } else {
        accessWarning = 'Atenção: nenhuma conta tem acesso ao Portal do Parceiro desta empresa. Conceda o acesso na aba "Equipe".';
      }
    }
  }

  return NextResponse.json({ partner: data, accessWarning });
}
