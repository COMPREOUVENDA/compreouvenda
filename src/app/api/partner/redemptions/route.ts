import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requirePartner } from '@/lib/api-auth';
import { evaluateAvailability } from '@/lib/club';

export const dynamic = 'force-dynamic';

/**
 * Validação de benefícios no balcão do parceiro.
 *
 * GET  — histórico de validações da própria empresa (sem dados pessoais).
 * POST — valida um código apresentado pelo cliente.
 *
 * LGPD: a listagem nunca devolve nome/e-mail do usuário. O balcão precisa
 * saber apenas que o código é válido, não quem é a pessoa. Ao validar,
 * devolvemos somente o primeiro nome, que é o mínimo necessário para o
 * atendente confirmar que está atendendo a pessoa certa.
 *
 * O incremento de `used_quantity` no benefício é feito pelo trigger
 * `trg_bump_benefit_usage` — a rota não soma nada manualmente, para não
 * haver duas fontes de verdade sobre o consumo.
 */

export async function GET(req: NextRequest) {
  const p = await requirePartner(req, 'operator', false);
  if (p instanceof NextResponse) return p;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const unitId = searchParams.get('unit_id');
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);

  const db = getServiceClient();
  let q = db.from('benefit_redemptions')
    .select('id, code, status, method, purchase_value, discount_applied, is_new_customer, validated_at, expires_at, created_at, user_id, benefit:benefits(id, title), unit:partner_units(id, name), campaign:partner_campaigns(id, title)')
    .eq('partner_id', p.partnerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'all') q = q.eq('status', status);
  // Um operador vinculado a uma unidade só enxerga o movimento dela.
  const scopedUnit = p.role === 'operator' && p.unitId ? p.unitId : unitId;
  if (scopedUnit) q = q.eq('unit_id', scopedUnit);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Remove o identificador do usuário da resposta: o parceiro sabe que houve
  // um cliente, mas não recebe o vínculo com a conta do marketplace.
  const rows = (data ?? []).map(({ user_id, ...r }) => ({ ...r, has_user: !!user_id }));

  return NextResponse.json({
    redemptions: rows,
    counts: {
      total: rows.length,
      validated: rows.filter((r) => r.status === 'validated').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      expired: rows.filter((r) => r.status === 'expired').length,
    },
    scopedToUnit: p.role === 'operator' ? p.unitId : null,
  });
}

export async function POST(req: NextRequest) {
  // Validar é a função do balcão: todo membro ativo pode, inclusive o operador.
  const p = await requirePartner(req, 'operator');
  if (p instanceof NextResponse) return p;

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Informe o código apresentado pelo cliente' }, { status: 400 });

  const db = getServiceClient();

  const { data: red } = await db
    .from('benefit_redemptions')
    .select('*, benefit:benefits(id, title, status, total_quantity, used_quantity, starts_at, ends_at, valid_weekdays, valid_hour_start, valid_hour_end, min_purchase_value, discount_percent, discount_value, benefit_type)')
    .eq('code', code)
    .maybeSingle();

  if (!red) {
    return NextResponse.json({ error: 'Código não encontrado', code: 'not_found' }, { status: 404 });
  }

  // Um código de outra empresa não pode ser validado aqui — e a mensagem não
  // revela de qual empresa ele é.
  if (red.partner_id !== p.partnerId) {
    return NextResponse.json(
      { error: 'Este código não pertence à sua empresa', code: 'wrong_partner' },
      { status: 403 }
    );
  }

  if (red.status === 'validated') {
    return NextResponse.json(
      {
        error: 'Este código já foi utilizado',
        code: 'already_used',
        validated_at: red.validated_at,
      },
      { status: 409 }
    );
  }
  if (red.status === 'cancelled') {
    return NextResponse.json({ error: 'Este código foi cancelado', code: 'cancelled' }, { status: 409 });
  }

  const now = new Date();

  if (red.expires_at && new Date(red.expires_at) < now) {
    // Marca como expirado para não ficar pendente para sempre.
    await db.from('benefit_redemptions').update({ status: 'expired' }).eq('id', red.id);
    return NextResponse.json({ error: 'Este código expirou', code: 'expired' }, { status: 409 });
  }

  const benefit = Array.isArray(red.benefit) ? red.benefit[0] : red.benefit;
  if (!benefit) {
    return NextResponse.json({ error: 'Benefício não encontrado', code: 'benefit_missing' }, { status: 404 });
  }
  if (benefit.status !== 'approved') {
    return NextResponse.json(
      { error: `O benefício "${benefit.title}" não está ativo (${benefit.status})`, code: 'benefit_inactive' },
      { status: 409 }
    );
  }

  // Vigência, estoque e janela de dia/hora seguem a MESMA regra da vitrine do
  // aplicativo (src/lib/club.ts) — inclusive o fuso de Brasília. Avaliar isso
  // no fuso do servidor recusaria, em produção (UTC), um cliente que está na
  // loja dentro do horário anunciado.
  const disponibilidade = evaluateAvailability(benefit, now);
  if (!disponibilidade.available) {
    return NextResponse.json(
      { error: disponibilidade.reason, code: disponibilidade.code },
      { status: 409 }
    );
  }

  const purchaseValue = body.purchase_value != null ? Number(body.purchase_value) : null;
  if (purchaseValue != null && (!Number.isFinite(purchaseValue) || purchaseValue < 0)) {
    return NextResponse.json({ error: 'Valor da compra inválido' }, { status: 400 });
  }
  if (benefit.min_purchase_value && (purchaseValue ?? 0) < Number(benefit.min_purchase_value)) {
    return NextResponse.json(
      {
        error: `Compra mínima de ${Number(benefit.min_purchase_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para este benefício`,
        code: 'below_minimum',
      },
      { status: 409 }
    );
  }

  // Desconto calculado no servidor, não aceito do cliente: o balcão informa
  // apenas o valor da compra.
  let discount: number | null = null;
  if (purchaseValue != null) {
    if (benefit.benefit_type === 'percent_discount' && benefit.discount_percent) {
      discount = Number((purchaseValue * Number(benefit.discount_percent) / 100).toFixed(2));
    } else if (benefit.discount_value) {
      discount = Math.min(Number(benefit.discount_value), purchaseValue);
    }
  }

  // Cliente novo = primeira validação dele nesta empresa.
  let isNew = false;
  if (red.user_id) {
    const { count } = await db.from('benefit_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('partner_id', p.partnerId)
      .eq('user_id', red.user_id)
      .eq('status', 'validated');
    isNew = (count ?? 0) === 0;
  }

  const unitId = red.unit_id ?? (p.unitId || body.unit_id) ?? null;

  const { data: updated, error } = await db
    .from('benefit_redemptions')
    .update({
      status: 'validated',
      validated_at: now.toISOString(),
      validated_by: p.userId,
      purchase_value: purchaseValue,
      discount_applied: discount,
      is_new_customer: isNew,
      unit_id: unitId,
    })
    .eq('id', red.id)
    // Trava de concorrência: se outro caixa validar no mesmo instante, o
    // segundo update não encontra a linha ainda pendente e falha.
    .eq('status', red.status)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!updated) {
    return NextResponse.json(
      { error: 'Este código acabou de ser validado em outro atendimento', code: 'race' },
      { status: 409 }
    );
  }

  // Primeiro nome apenas — o suficiente para conferir o atendimento.
  let firstName: string | null = null;
  if (red.user_id) {
    const { data: u } = await db.from('users').select('name').eq('id', red.user_id).maybeSingle();
    firstName = u?.name ? String(u.name).split(' ')[0] : null;
  }

  return NextResponse.json({
    ok: true,
    redemption: {
      id: updated.id,
      code: updated.code,
      validated_at: updated.validated_at,
      purchase_value: updated.purchase_value,
      discount_applied: updated.discount_applied,
      is_new_customer: updated.is_new_customer,
    },
    benefit: { id: benefit.id, title: benefit.title },
    customerFirstName: firstName,
    message: isNew
      ? 'Benefício validado. Este é um cliente novo trazido pelo COMPREOUVENDA.'
      : 'Benefício validado com sucesso.',
  });
}
