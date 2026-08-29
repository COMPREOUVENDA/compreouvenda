import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Gestão de acesso ao Portal do Parceiro.
 *
 * É esta tabela — `partner_members` — que efetivamente abre o portal para um
 * lojista. O campo `partners.owner_id` registra quem é o responsável comercial,
 * mas sozinho não concede acesso algum.
 *
 * Não existe convite por e-mail nem criação de conta: o acesso é concedido a
 * uma conta que já existe no marketplace. Isso mantém uma única identidade por
 * pessoa e evita cadastros duplicados.
 *
 * Papéis (hierarquia aplicada em `requirePartner`):
 *   owner    — cadastro da empresa, documentos, equipe, plano
 *   manager  — benefícios, campanhas, unidades, relatórios
 *   operator — apenas validação de benefícios no balcão
 */

const ROLES = ['owner', 'manager', 'operator'] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Responsável',
  manager: 'Gerente',
  operator: 'Operador',
};

async function audit(admin: AdminIdentity, action: string, partnerId: string, details: unknown) {
  try {
    await getServiceClient().from('audit_logs').insert({
      actor_id: admin.id,
      actor_email: admin.email,
      action,
      target_type: 'partner',
      target_id: partnerId,
      details,
    });
  } catch {
    // auditoria nunca bloqueia a operação principal
  }
}

// ─── GET: quem tem acesso ao portal desta empresa ───────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();

  const [partner, members, units] = await Promise.all([
    db.from('partners').select('id, trade_name, status, owner_id').eq('id', params.id).maybeSingle(),
    db.from('partner_members')
      .select('id, role, unit_id, is_active, created_at, user:users(id, name, email, avatar_url)')
      .eq('partner_id', params.id)
      .order('created_at'),
    db.from('partner_units').select('id, name').eq('partner_id', params.id),
  ]);

  if (!partner.data) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }
  const partnerRow = partner.data;

  const unitMap = new Map((units.data ?? []).map((u) => [u.id, u.name]));

  const rows = (members.data ?? []).map((m) => {
    const user = Array.isArray(m.user) ? m.user[0] : m.user;
    return {
      id: m.id,
      role: m.role,
      role_label: ROLE_LABEL[m.role as Role] ?? m.role,
      unit_id: m.unit_id,
      unit_name: m.unit_id ? unitMap.get(m.unit_id) ?? 'Unidade removida' : null,
      is_active: m.is_active,
      created_at: m.created_at,
      user: user ?? null,
      is_owner_of_record: !!user && user.id === partnerRow.owner_id,
    };
  });

  return NextResponse.json({
    members: rows,
    units: units.data ?? [],
    partner: {
      id: partnerRow.id,
      trade_name: partnerRow.trade_name,
      status: partnerRow.status,
      owner_id: partnerRow.owner_id,
    },
    // Sinaliza a situação que deixa o parceiro sem conseguir entrar no portal.
    warnings: [
      rows.length === 0 && 'Nenhuma conta tem acesso ao Portal do Parceiro desta empresa.',
      rows.length > 0 && !rows.some((m) => m.is_active) && 'Todos os acessos estão inativos.',
      rows.length > 0 && !rows.some((m) => m.is_active && m.role === 'owner')
        && 'Nenhum responsável ativo — apenas o responsável pode gerir documentos e equipe.',
    ].filter(Boolean),
  });
}

// ─── POST: conceder acesso a uma conta existente ────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req, ['admin_operational']);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const role = String(body.role ?? 'manager') as Role;
  const unitId = body.unit_id ? String(body.unit_id) : null;

  if (!email) {
    return NextResponse.json({ error: 'Informe o e-mail da conta que receberá o acesso' }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: `Papel inválido. Use: ${ROLES.join(', ')}` }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: partner } = await db
    .from('partners').select('id, trade_name, owner_id').eq('id', params.id).maybeSingle();
  if (!partner) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  // A conta precisa existir: o portal não cria usuários.
  const { data: user } = await db
    .from('users').select('id, name, email').ilike('email', email).maybeSingle();

  if (!user) {
    return NextResponse.json(
      {
        error: `Nenhuma conta encontrada para ${email}. A pessoa precisa se cadastrar no COMPREOUVENDA antes de receber acesso ao portal.`,
        code: 'user_not_found',
      },
      { status: 404 }
    );
  }

  // Uma unidade específica só faz sentido se pertencer a esta empresa.
  if (unitId) {
    const { data: unit } = await db
      .from('partner_units').select('id').eq('id', unitId).eq('partner_id', params.id).maybeSingle();
    if (!unit) {
      return NextResponse.json({ error: 'Unidade não pertence a esta empresa' }, { status: 400 });
    }
  }

  // Uma conta não pode operar duas empresas: o portal resolve o vínculo pelo
  // usuário, então dois vínculos ativos tornariam o acesso ambíguo.
  const { data: other } = await db
    .from('partner_members')
    .select('partner_id, partner:partners(trade_name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .neq('partner_id', params.id)
    .maybeSingle();

  if (other) {
    const p = Array.isArray(other.partner) ? other.partner[0] : other.partner;
    return NextResponse.json(
      {
        error: `Esta conta já tem acesso ativo à empresa "${p?.trade_name ?? 'outra empresa'}". Revogue o acesso anterior antes de vinculá-la aqui.`,
        code: 'already_linked',
      },
      { status: 409 }
    );
  }

  const { data: existing } = await db
    .from('partner_members')
    .select('id, is_active, role')
    .eq('partner_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  let member;
  if (existing) {
    // Reconceder acesso revogado é uma reativação, não um novo vínculo.
    const { data, error } = await db
      .from('partner_members')
      .update({ role, unit_id: unitId, is_active: true })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    member = data;
  } else {
    const { data, error } = await db
      .from('partner_members')
      .insert({ partner_id: params.id, user_id: user.id, role, unit_id: unitId, is_active: true })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    member = data;
  }

  // O primeiro responsável vinculado também vira o responsável de registro.
  if (role === 'owner' && !partner.owner_id) {
    await db.from('partners').update({ owner_id: user.id }).eq('id', params.id);
  }

  await audit(admin, 'partner_access_granted', params.id, {
    user_email: user.email,
    user_name: user.name,
    role,
    unit_id: unitId,
    reactivated: !!existing,
    by: admin.email,
  });

  return NextResponse.json(
    {
      member,
      message: `${user.name || user.email} agora tem acesso como ${ROLE_LABEL[role]}.`,
    },
    { status: existing ? 200 : 201 }
  );
}

// ─── PATCH: alterar papel, unidade ou reativar/desativar ────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req, ['admin_operational']);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json().catch(() => ({}));
  const memberId = String(body.member_id ?? '');
  if (!memberId) {
    return NextResponse.json({ error: 'Informe o membro' }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: current } = await db
    .from('partner_members')
    .select('id, role, is_active, user_id, user:users(name, email)')
    .eq('id', memberId)
    .eq('partner_id', params.id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: 'Membro não encontrado nesta empresa' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: `Papel inválido. Use: ${ROLES.join(', ')}` }, { status: 400 });
    }
    patch.role = body.role;
  }

  if (body.unit_id !== undefined) {
    if (body.unit_id) {
      const { data: unit } = await db
        .from('partner_units').select('id').eq('id', body.unit_id).eq('partner_id', params.id).maybeSingle();
      if (!unit) {
        return NextResponse.json({ error: 'Unidade não pertence a esta empresa' }, { status: 400 });
      }
    }
    patch.unit_id = body.unit_id || null;
  }

  if (body.is_active !== undefined) patch.is_active = !!body.is_active;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nenhuma alteração informada' }, { status: 400 });
  }

  // Não deixar a empresa sem nenhum responsável ativo: sem owner, ninguém
  // consegue gerir documentos e equipe pelo portal.
  const losingOwner =
    (patch.role !== undefined && current.role === 'owner' && patch.role !== 'owner') ||
    (patch.is_active === false && current.role === 'owner');

  if (losingOwner) {
    const { count } = await db
      .from('partner_members')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', params.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .neq('id', memberId);

    if ((count ?? 0) === 0) {
      return NextResponse.json(
        {
          error: 'Esta é a única conta responsável ativa da empresa. Promova outro responsável antes de alterar esta.',
          code: 'last_owner',
        },
        { status: 409 }
      );
    }
  }

  const { data, error } = await db
    .from('partner_members').update(patch).eq('id', memberId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const user = Array.isArray(current.user) ? current.user[0] : current.user;
  await audit(admin, 'partner_access_updated', params.id, {
    user_email: user?.email,
    changes: patch,
    by: admin.email,
  });

  return NextResponse.json({ member: data });
}

// ─── DELETE: revogar acesso ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req, ['admin_operational']);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'Informe o membro' }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: current } = await db
    .from('partner_members')
    .select('id, role, is_active, user:users(name, email)')
    .eq('id', memberId)
    .eq('partner_id', params.id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: 'Membro não encontrado nesta empresa' }, { status: 404 });
  }

  if (current.role === 'owner' && current.is_active) {
    const { count } = await db
      .from('partner_members')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', params.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .neq('id', memberId);

    if ((count ?? 0) === 0) {
      return NextResponse.json(
        {
          error: 'Esta é a única conta responsável ativa da empresa. Promova outro responsável antes de revogar este acesso.',
          code: 'last_owner',
        },
        { status: 409 }
      );
    }
  }

  const { error } = await db.from('partner_members').delete().eq('id', memberId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const user = Array.isArray(current.user) ? current.user[0] : current.user;
  await audit(admin, 'partner_access_revoked', params.id, {
    user_email: user?.email,
    role: current.role,
    by: admin.email,
  });

  return NextResponse.json({
    ok: true,
    message: `Acesso de ${user?.name || user?.email || 'membro'} revogado.`,
  });
}
