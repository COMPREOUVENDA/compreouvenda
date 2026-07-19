import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

// ─── Rota de signup server-side ─────────────────────────────────────────────
// Usa SERVICE ROLE KEY para bypassar o rate limit de email do Supabase Auth
// no plano Free. Deve ser usada apenas quando NEXT_PUBLIC_ENABLE_SERVER_SIGNUP
// estiver 'true'. Em produção com Supabase Pro, preferir signup normal no client.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enableServerSignup = process.env.NEXT_PUBLIC_ENABLE_SERVER_SIGNUP === 'true';

export async function POST(req: NextRequest) {
  // ── Guard feature flag ────────────────────────────────────────────────────
  if (!enableServerSignup) {
    return NextResponse.json(
      { error: 'Server signup desativado. Use o fluxo normal.' },
      { status: 403 }
    );
  }

  // ── Rate limit por IP ─────────────────────────────────────────────────────
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = rateLimit('server-signup:' + ip, { limit: 5, windowSec: 60 }); // 5/min
  if (!success) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429 }
    );
  }

  // ── Validar env ───────────────────────────────────────────────────────────
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Configuração de servidor incompleta.' },
      { status: 500 }
    );
  }

  // ── Validar payload ───────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const name = String(body.name ?? '').trim();
  const type = String(body.type ?? 'buyer');
  const phone = String(body.phone ?? '').replace(/\D/g, '');
  const document = String(body.document ?? '').replace(/\D/g, '');
  const city = String(body.city ?? '').trim();
  const state = String(body.state ?? '').trim();

  if (!email || !password || password.length < 6 || !name) {
    return NextResponse.json(
      { error: 'Email, senha (mínimo 6 caracteres) e nome são obrigatórios.' },
      { status: 400 }
    );
  }

  // ── Criar usuário no Supabase Auth via admin API ──────────────────────────
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verifica se o email já existe
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Este e-mail já está cadastrado. Faça login.' },
      { status: 409 }
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // evita envio de email de confirmação
    user_metadata: {
      name,
      type,
      phone,
      document,
      city,
      state,
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? 'Erro ao criar conta no servidor.' },
      { status: 500 }
    );
  }

  // ── Atualiza perfil (trigger handle_new_user já criou, mas garante extras) ─
  const updatePayload: Record<string, string | number | boolean> = {};
  if (phone) updatePayload.phone = phone;
  if (document) updatePayload.document = document;
  if (city) updatePayload.city = city;
  if (state) updatePayload.state = state;

  if (Object.keys(updatePayload).length > 0) {
    await admin.from('users').update(updatePayload).eq('auth_id', data.user.id);
  }

  // ── Retorna sessão para login automático ──────────────────────────────────
  const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.session) {
    return NextResponse.json(
      { error: 'Conta criada, mas falha ao gerar sessão. Faça login manualmente.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_at: signInData.session.expires_at,
    },
  });
}
