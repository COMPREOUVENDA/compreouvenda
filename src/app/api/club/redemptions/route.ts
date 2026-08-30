import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getPublicProfile, getServiceClient } from '@/lib/api-auth';
import { evaluateAvailability, generateRedemptionCode, benefitHighlight } from '@/lib/club';

export const dynamic = 'force-dynamic';

/**
 * Códigos de resgate do Clube de Benefícios — a ponta do usuário.
 *
 * POST   gera o código que será apresentado no balcão do parceiro
 * GET    lista os códigos do usuário (ativos e histórico)
 * DELETE cancela um código pendente
 *
 * O código gerado aqui é exatamente o que `POST /api/partner/redemptions`
 * consome. Aquela rota normaliza para maiúsculas, então a geração produz
 * maiúsculas — e o incremento de `used_quantity` fica por conta do trigger
 * `trg_bump_benefit_usage`, na validação. Gerar código não consome estoque:
 * quem consome é a utilização real na loja.
 */

/** Um código vale por 24h, nunca além do fim do próprio benefício. */
const VALIDADE_HORAS = 24;

async function resolverUsuario(req: NextRequest) {
  const authId = await getAuthUserId(req);
  if (!authId) return null;
  const profile = await getPublicProfile(authId, 'id, name');
  return profile?.id ? { id: profile.id as string, name: profile.name as string | null } : null;
}

/** Assinatura ativa é pré-requisito apenas para benefícios `audience='premium'`. */
async function temAssinaturaAtiva(userId: string): Promise<boolean> {
  const { data } = await getServiceClient()
    .from('subscriptions')
    .select('id, status, next_billing_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!data) return false;
  if (data.next_billing_at && new Date(data.next_billing_at) < new Date()) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const user = await resolverUsuario(req);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let q = db
    .from('benefit_redemptions')
    .select(`
      id, code, status, method, expires_at, validated_at, created_at,
      discount_applied, purchase_value,
      benefit:benefits(id, title, benefit_type, discount_percent, discount_value, image_url, ends_at),
      partner:partners(id, trade_name, legal_name, logo_url),
      unit:partner_units(id, name, city, state, street, number, neighborhood)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const agora = new Date();

  const redemptions = (data ?? []).map((r) => {
    const benefit = Array.isArray(r.benefit) ? r.benefit[0] : r.benefit;
    const partner = Array.isArray(r.partner) ? r.partner[0] : r.partner;
    const unit = Array.isArray(r.unit) ? r.unit[0] : r.unit;

    // Um código pendente com prazo vencido é exibido como expirado mesmo antes
    // de alguém tentar validá-lo — a tela não pode prometer o que não vale.
    const vencido = r.status === 'pending' && r.expires_at && new Date(r.expires_at) < agora;

    return {
      id: r.id,
      code: r.code,
      status: vencido ? 'expired' : r.status,
      expires_at: r.expires_at,
      validated_at: r.validated_at,
      created_at: r.created_at,
      discount_applied: r.discount_applied,
      purchase_value: r.purchase_value,
      benefit: benefit
        ? { id: benefit.id, title: benefit.title, highlight: benefitHighlight(benefit), image_url: benefit.image_url }
        : null,
      partner: partner
        ? { id: partner.id, name: partner.trade_name || partner.legal_name, logo_url: partner.logo_url }
        : null,
      unit: unit ?? null,
    };
  });

  return NextResponse.json({
    redemptions,
    active: redemptions.filter((r) => r.status === 'pending').length,
  });
}

export async function POST(req: NextRequest) {
  const user = await resolverUsuario(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Entre na sua conta para resgatar este benefício', code: 'unauthenticated' },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const benefitId = String(body.benefit_id ?? '').trim();
  const unitId = body.unit_id ? String(body.unit_id).trim() : null;

  if (!benefitId) {
    return NextResponse.json({ error: 'Informe o benefício' }, { status: 400 });
  }

  const db = getServiceClient();

  const { data: benefit } = await db
    .from('benefits')
    .select(`
      id, partner_id, title, status, audience, per_user_limit,
      starts_at, ends_at, valid_weekdays, valid_hour_start, valid_hour_end,
      total_quantity, used_quantity,
      partner:partners(id, status, trade_name, legal_name)
    `)
    .eq('id', benefitId)
    .maybeSingle();

  if (!benefit) {
    return NextResponse.json({ error: 'Benefício não encontrado', code: 'not_found' }, { status: 404 });
  }

  const partner = Array.isArray(benefit.partner) ? benefit.partner[0] : benefit.partner;
  if (benefit.status !== 'approved' || partner?.status !== 'approved') {
    return NextResponse.json(
      { error: 'Este benefício não está disponível', code: 'unavailable' },
      { status: 409 }
    );
  }

  // Mesma regra da vitrine e do balcão — inclusive o fuso de Brasília.
  const disp = evaluateAvailability(benefit);
  if (!disp.available) {
    return NextResponse.json({ error: disp.reason, code: disp.code }, { status: 409 });
  }

  if (benefit.audience === 'premium' && !(await temAssinaturaAtiva(user.id))) {
    return NextResponse.json(
      {
        error: 'Este benefício é exclusivo para assinantes Premium',
        code: 'premium_required',
      },
      { status: 403 }
    );
  }

  // Quantas vezes esta pessoa já usou o benefício (utilizações efetivas).
  if (benefit.per_user_limit != null) {
    const { count } = await db
      .from('benefit_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('benefit_id', benefit.id)
      .eq('user_id', user.id)
      .eq('status', 'validated');

    if ((count ?? 0) >= benefit.per_user_limit) {
      return NextResponse.json(
        {
          error: benefit.per_user_limit === 1
            ? 'Você já utilizou este benefício'
            : `Você já utilizou este benefício ${benefit.per_user_limit} vezes (limite por pessoa)`,
          code: 'per_user_limit',
        },
        { status: 409 }
      );
    }
  }

  // Já existe um código pendente? Devolve o mesmo em vez de criar outro.
  // Duas pessoas com dois códigos do mesmo benefício na mão é fraude fácil.
  const { data: existente } = await db
    .from('benefit_redemptions')
    .select('id, code, expires_at, created_at, unit_id')
    .eq('benefit_id', benefit.id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existente) {
    const vencido = existente.expires_at && new Date(existente.expires_at) < new Date();
    if (!vencido) {
      return NextResponse.json(
        {
          error: 'Você já tem um código ativo para este benefício',
          code: 'already_has_code',
          redemption: existente,
        },
        { status: 409 }
      );
    }
    // Vencido: libera o espaço antes de gerar o novo (o índice único parcial
    // `idx_redem_one_pending` só admite um pendente por benefício/usuário).
    await db.from('benefit_redemptions').update({ status: 'expired' }).eq('id', existente.id);
  }

  // A unidade escolhida precisa ser do mesmo parceiro.
  if (unitId) {
    const { data: unit } = await db
      .from('partner_units')
      .select('id')
      .eq('id', unitId)
      .eq('partner_id', benefit.partner_id)
      .maybeSingle();
    if (!unit) {
      return NextResponse.json(
        { error: 'A unidade escolhida não pertence a esta empresa', code: 'invalid_unit' },
        { status: 400 }
      );
    }
  }

  const limite = new Date(Date.now() + VALIDADE_HORAS * 60 * 60 * 1000);
  const fimBeneficio = benefit.ends_at ? new Date(benefit.ends_at) : null;
  const expiresAt = fimBeneficio && fimBeneficio < limite ? fimBeneficio : limite;

  // Colisão de código é improvável (32^8), mas o UNIQUE do banco é a garantia:
  // em vez de confiar na sorte, tentamos de novo.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const code = generateRedemptionCode();
    const { data, error } = await db
      .from('benefit_redemptions')
      .insert({
        benefit_id: benefit.id,
        partner_id: benefit.partner_id,
        unit_id: unitId,
        user_id: user.id,
        code,
        method: 'qr_code',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select('id, code, status, expires_at, created_at, unit_id')
      .single();

    if (!error && data) {
      return NextResponse.json(
        {
          redemption: data,
          benefit: { id: benefit.id, title: benefit.title },
          partner: { id: partner.id, name: partner.trade_name || partner.legal_name },
          message: `Apresente o código ${data.code} no balcão para usar o benefício.`,
        },
        { status: 201 }
      );
    }

    // Corrida: outra requisição criou o pendente entre a checagem e o insert.
    if (error && /idx_redem_one_pending/.test(error.message)) {
      return NextResponse.json(
        { error: 'Você já tem um código ativo para este benefício', code: 'already_has_code' },
        { status: 409 }
      );
    }
    if (error && !/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: 'Não foi possível gerar um código agora. Tente novamente.' },
    { status: 503 }
  );
}

export async function DELETE(req: NextRequest) {
  const user = await resolverUsuario(req);
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe o código a cancelar' }, { status: 400 });

  const db = getServiceClient();

  // O filtro por user_id é a autorização: ninguém cancela o código de outro.
  const { data, error } = await db
    .from('benefit_redemptions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: 'Código não encontrado ou já utilizado' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, message: 'Código cancelado' });
}
