import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { cleanEnv } from '@/lib/env';

/**
 * Resolve o usuário autenticado aceitando tanto o cookie de sessão do Supabase
 * quanto o header `Authorization: Bearer <access_token>`.
 *
 * Necessário porque parte do app envia o token manualmente (clientes móveis,
 * chamadas server-to-server e testes automatizados) enquanto o restante depende
 * do cookie definido pelo middleware.
 */
export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  // 1. Cookie de sessão
  try {
    const ssr = createServerClient();
    const { data } = await ssr.auth.getUser();
    if (data?.user) return data.user.id;
  } catch {
    // segue para o bearer
  }

  // 2. Authorization: Bearer <token>
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!bearer) return null;

  try {
    const anon = createClient(
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    const { data } = await anon.auth.getUser(bearer);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Cliente com service role — bypassa RLS. Use apenas em rotas server-side. */
export function getServiceClient() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Resolve o perfil público (public.users) a partir do auth uid. */
export async function getPublicProfile(authUserId: string, columns = 'id, name, email') {
  const admin = getServiceClient();
  const { data } = await admin
    .from('users')
    .select(columns)
    .eq('auth_id', authUserId)
    .single();
  return data as Record<string, any> | null;
}

// ─── Autorização administrativa ───────────────────────────────────────────
//
// FONTE ÚNICA DE VERDADE: a tabela `public.admin_users`.
//
// O projeto tinha dois mecanismos concorrentes e dessincronizados: o painel
// checava `public.users.role` enquanto as rotas de escrow checavam
// `public.admin_users`. Isso permitia que uma conta fosse admin em um lado e
// não no outro, e ignorava o `is_active` (revogação) em metade do sistema.
// Toda verificação de privilégio administrativo passa a usar este módulo.

export const ADMIN_ROLES = [
  'super_admin',
  'admin_operational',
  'admin_financial',
  'admin_support',
  'admin_moderation',
  'admin_content',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AdminIdentity {
  id: string;
  authId: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

/**
 * Resolve a identidade administrativa do usuário autenticado.
 * Retorna `null` quando não há sessão, quando a conta não é admin ou quando o
 * acesso foi revogado (`is_active = false`).
 */
export async function getAdminIdentity(request: NextRequest): Promise<AdminIdentity | null> {
  const authUserId = await getAuthUserId(request);
  if (!authUserId) return null;

  const { data } = await getServiceClient()
    .from('admin_users')
    .select('id, auth_id, email, name, role, is_active')
    .eq('auth_id', authUserId)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  return {
    id: data.id as string,
    authId: data.auth_id as string,
    email: data.email as string,
    name: (data.name as string | null) ?? null,
    role: data.role as AdminRole,
  };
}

/**
 * Guarda de rota. Devolve a identidade do admin ou uma `NextResponse` de erro
 * pronta para retornar (401 sem sessão, 403 sem privilégio suficiente).
 *
 * `super_admin` sempre passa, independentemente de `allowedRoles`.
 *
 *   const admin = await requireAdmin(req, ['admin_financial']);
 *   if (admin instanceof NextResponse) return admin;
 */
export async function requireAdmin(
  request: NextRequest,
  allowedRoles?: readonly AdminRole[]
): Promise<AdminIdentity | NextResponse> {
  const authUserId = await getAuthUserId(request);
  if (!authUserId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const admin = await getAdminIdentity(request);
  if (!admin) {
    return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
  }

  if (allowedRoles?.length && admin.role !== 'super_admin' && !allowedRoles.includes(admin.role)) {
    return NextResponse.json(
      { error: 'Seu perfil administrativo não permite esta operação', role: admin.role },
      { status: 403 }
    );
  }

  return admin;
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos) usando os dígitos verificadores. */
export function isValidTaxId(raw: string | null | undefined): boolean {
  const d = String(raw ?? '').replace(/\D/g, '');

  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
    let check = (sum * 10) % 11 % 10;
    if (check !== Number(d[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
    check = (sum * 10) % 11 % 10;
    return check === Number(d[10]);
  }

  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (len: number) => {
      const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < len; i++) sum += Number(d[i]) * weights[i];
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
  }

  return false;
}
