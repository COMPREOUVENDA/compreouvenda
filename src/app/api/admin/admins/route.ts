import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const VALID_ROLES = [
  'super_admin', 'admin_operational', 'admin_financial',
  'admin_support', 'admin_moderation', 'admin_content',
] as const;

type Role = (typeof VALID_ROLES)[number];

/** Impede que a plataforma fique sem nenhum super_admin ativo. */
async function isLastActiveSuperAdmin(
  admin: ReturnType<typeof getServiceClient>,
  id: string
): Promise<boolean> {
  const { data } = await admin
    .from('admin_users')
    .select('id')
    .eq('role', 'super_admin')
    .eq('is_active', true);
  const supers = data ?? [];
  return supers.length <= 1 && supers.some((s) => s.id === id);
}

/** Lista os administradores cadastrados. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const { data, error } = await admin
    .from('admin_users')
    .select('id, auth_id, email, name, role, is_active, created_at, updated_at')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  return NextResponse.json({
    admins: rows.map((a) => ({
      ...a,
      // Sem auth_id o registro não consegue autenticar — sinaliza pendência.
      can_sign_in: !!a.auth_id,
      is_self: a.id === (auth as AdminIdentity).id,
    })),
    counts: {
      total: rows.length,
      active: rows.filter((a) => a.is_active).length,
      superAdmins: rows.filter((a) => a.role === 'super_admin' && a.is_active).length,
    },
    currentRole: (auth as AdminIdentity).role,
  });
}

/**
 * Promove um usuário existente a administrador.
 *
 * O vínculo é feito por `auth_id` para que o login funcione; se o e-mail não
 * tiver conta, o cadastro é recusado em vez de criar um admin que não consegue
 * entrar.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, ['super_admin']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { email, role, name } = body as { email?: string; role?: string; name?: string };

  const cleanEmail = String(email ?? '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'Informe um e-mail válido' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: 'Nível de acesso inválido' }, { status: 400 });
  }

  const admin = getServiceClient();

  const { data: existing } = await admin
    .from('admin_users')
    .select('id, role, is_active')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Este e-mail já é administrador. Ajuste o nível na lista.' },
      { status: 409 }
    );
  }

  // O admin precisa de uma conta de autenticação para conseguir entrar.
  const { data: appUser } = await admin
    .from('users')
    .select('auth_id, name')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (!appUser?.auth_id) {
    return NextResponse.json(
      { error: 'Nenhum usuário cadastrado com este e-mail. Peça que ele crie a conta primeiro.' },
      { status: 404 }
    );
  }

  const { data, error } = await admin
    .from('admin_users')
    .insert({
      auth_id: appUser.auth_id,
      email: cleanEmail,
      name: (name && String(name).trim()) || appUser.name || cleanEmail,
      role,
      is_active: true,
    })
    .select('id, email, name, role, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'admin_granted',
      target_type: 'admin_user',
      target_id: data.id,
      details: { email: cleanEmail, role },
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ admin: data }, { status: 201 });
}

/** Altera o nível de acesso ou ativa/desativa um administrador. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, ['super_admin']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { id, role, is_active } = body as { id?: string; role?: string; is_active?: boolean };

  if (!id) return NextResponse.json({ error: 'Informe `id`' }, { status: 400 });
  if (role && !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: 'Nível de acesso inválido' }, { status: 400 });
  }
  if (role === undefined && is_active === undefined) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }

  const admin = getServiceClient();

  // Um super_admin não pode se rebaixar nem se desativar por engano.
  if (id === identity.id && (role !== undefined || is_active === false)) {
    return NextResponse.json(
      { error: 'Você não pode alterar o próprio nível de acesso.' },
      { status: 409 }
    );
  }

  const perdeSuperAdmin = is_active === false || (role && role !== 'super_admin');
  if (perdeSuperAdmin && (await isLastActiveSuperAdmin(admin, id))) {
    return NextResponse.json(
      { error: 'Este é o último super admin ativo. Promova outro antes de alterá-lo.' },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role !== undefined) patch.role = role;
  if (is_active !== undefined) patch.is_active = is_active;

  const { data, error } = await admin
    .from('admin_users')
    .update(patch)
    .eq('id', id)
    .select('id, email, role, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'admin_updated',
      target_type: 'admin_user',
      target_id: id,
      details: patch,
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ admin: data });
}

/** Revoga o acesso administrativo. */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, ['super_admin']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe `id`' }, { status: 400 });

  if (id === identity.id) {
    return NextResponse.json({ error: 'Você não pode remover o próprio acesso.' }, { status: 409 });
  }

  const admin = getServiceClient();
  if (await isLastActiveSuperAdmin(admin, id)) {
    return NextResponse.json(
      { error: 'Este é o último super admin ativo e não pode ser removido.' },
      { status: 409 }
    );
  }

  const { data: alvo } = await admin
    .from('admin_users')
    .select('email')
    .eq('id', id)
    .maybeSingle();

  const { error } = await admin.from('admin_users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'admin_revoked',
      target_type: 'admin_user',
      target_id: id,
      details: { email: alvo?.email },
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ ok: true });
}
