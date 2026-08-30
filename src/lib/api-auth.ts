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
      cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      { global: { fetch: noStoreFetch } }
    );
    const { data } = await anon.auth.getUser(bearer);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * `fetch` sem cache para o supabase-js.
 *
 * O Next 14 guarda em Data Cache as respostas de `fetch` feitas no servidor — e
 * o supabase-js consulta o banco justamente por `fetch`. Na prática isso fez a
 * vitrine do clube continuar exibindo benefícios que já tinham sido removidos
 * do banco, e serviria resposta de uma sessão para outra em rotas de auth.
 * Leitura de banco nunca pode vir de cache: cada requisição consulta o estado
 * atual.
 */
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

/** Cliente com service role — bypassa RLS. Use apenas em rotas server-side. */
export function getServiceClient() {
  return createClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: noStoreFetch },
    }
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

// ─── Autorização do Portal do Parceiro ────────────────────────────────────
//
// Não existe autenticação paralela: o parceiro loga com a mesma conta
// `public.users` do marketplace. O vínculo com a empresa vive em
// `partner_members`, que é a única fonte de verdade sobre quem pode operar
// qual empresa e com qual nível de permissão.
//
// Hierarquia: owner > manager > operator.
//   owner    — cadastro da empresa, documentos, equipe, plano
//   manager   — benefícios, campanhas, unidades, relatórios
//   operator — apenas validação de benefícios no balcão

export const PARTNER_ROLES = ['owner', 'manager', 'operator'] as const;
export type PartnerRole = (typeof PARTNER_ROLES)[number];

/** `owner` cobre `manager`, que cobre `operator`. */
const PARTNER_ROLE_RANK: Record<PartnerRole, number> = { owner: 3, manager: 2, operator: 1 };

export interface PartnerIdentity {
  /** id em `public.users` (não é o auth uid) */
  userId: string;
  authId: string;
  partnerId: string;
  partnerName: string;
  /** status da empresa — o portal fica em modo leitura enquanto não for `approved` */
  partnerStatus: string;
  role: PartnerRole;
  /** quando preenchido, o membro só enxerga esta unidade */
  unitId: string | null;
}

/**
 * Resolve o vínculo do usuário autenticado com uma empresa parceira.
 * Retorna `null` quando não há sessão ou quando o usuário não é membro ativo
 * de nenhum parceiro.
 */
export async function getPartnerIdentity(request: NextRequest): Promise<PartnerIdentity | null> {
  const authUserId = await getAuthUserId(request);
  if (!authUserId) return null;

  const admin = getServiceClient();

  const profile = await getPublicProfile(authUserId, 'id');
  if (!profile?.id) return null;

  const { data } = await admin
    .from('partner_members')
    .select('partner_id, role, unit_id, is_active, partner:partners(id, legal_name, trade_name, status)')
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.partner_id) return null;

  const partner = Array.isArray(data.partner) ? data.partner[0] : data.partner;
  if (!partner) return null;

  return {
    userId: profile.id as string,
    authId: authUserId,
    partnerId: data.partner_id as string,
    partnerName: (partner.trade_name || partner.legal_name) as string,
    partnerStatus: partner.status as string,
    role: data.role as PartnerRole,
    unitId: (data.unit_id as string | null) ?? null,
  };
}

/**
 * Guarda de rota do Portal do Parceiro.
 *
 *   const p = await requirePartner(req, 'manager');
 *   if (p instanceof NextResponse) return p;
 *
 * `minRole` aplica a hierarquia: pedir `manager` aceita `manager` e `owner`.
 * `requireApproved` (padrão `true`) bloqueia escrita enquanto a empresa não
 * tiver sido aprovada pelo painel administrativo — use `false` nas rotas de
 * leitura, para que o parceiro em análise ainda consiga acompanhar o cadastro.
 */
export async function requirePartner(
  request: NextRequest,
  minRole: PartnerRole = 'operator',
  requireApproved = true
): Promise<PartnerIdentity | NextResponse> {
  const authUserId = await getAuthUserId(request);
  if (!authUserId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const partner = await getPartnerIdentity(request);
  if (!partner) {
    return NextResponse.json(
      { error: 'Sua conta não está vinculada a nenhuma empresa parceira' },
      { status: 403 }
    );
  }

  if (PARTNER_ROLE_RANK[partner.role] < PARTNER_ROLE_RANK[minRole]) {
    return NextResponse.json(
      { error: 'Seu perfil na empresa não permite esta operação', role: partner.role },
      { status: 403 }
    );
  }

  if (requireApproved && partner.partnerStatus !== 'approved') {
    return NextResponse.json(
      {
        error: `A empresa ainda não está aprovada (${partner.partnerStatus}). Aguarde a análise para realizar esta operação.`,
        partnerStatus: partner.partnerStatus,
      },
      { status: 403 }
    );
  }

  return partner;
}
