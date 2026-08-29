import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requirePartner } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Benefícios do próprio parceiro.
 *
 * O `partner_id` NUNCA vem do corpo da requisição: é sempre o do vínculo
 * autenticado. Isso impede que um parceiro crie ou edite benefício de outra
 * empresa mesmo forjando o payload.
 *
 * Fluxo de aprovação (espelha o painel administrativo):
 *   draft ──publicar──> pending ──admin──> approved
 * O parceiro só transita entre draft/pending/paused. Aprovar/rejeitar é
 * exclusividade do administrador.
 */

const PARTNER_ALLOWED_STATUS = ['draft', 'pending', 'paused'] as const;

const EDITABLE = [
  'title', 'description', 'benefit_type', 'discount_percent', 'discount_value',
  'min_purchase_value', 'category', 'eligible_categories', 'image_url', 'terms',
  'rules', 'starts_at', 'ends_at', 'valid_weekdays', 'valid_hour_start',
  'valid_hour_end', 'total_quantity',
] as const;

function pickEditable(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

export async function GET(req: NextRequest) {
  const p = await requirePartner(req, 'operator', false);
  if (p instanceof NextResponse) return p;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let q = getServiceClient()
    .from('benefits')
    .select('*, benefit_units(unit_id)')
    .eq('partner_id', p.partnerId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') q = q.eq('status', status);
  if (search) q = q.ilike('title', `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((b) => ({
    ...b,
    unit_ids: (b.benefit_units ?? []).map((u: { unit_id: string }) => u.unit_id),
    // Quando não há limite, `remaining` é null (ilimitado) — nunca 0.
    remaining: b.total_quantity == null ? null : Math.max(0, b.total_quantity - b.used_quantity),
    benefit_units: undefined,
  }));

  return NextResponse.json({
    benefits: rows,
    counts: {
      total: rows.length,
      approved: rows.filter((b) => b.status === 'approved').length,
      pending: rows.filter((b) => b.status === 'pending').length,
      draft: rows.filter((b) => b.status === 'draft').length,
      paused: rows.filter((b) => b.status === 'paused').length,
      rejected: rows.filter((b) => b.status === 'rejected').length,
    },
    canManage: p.partnerStatus === 'approved' && p.role !== 'operator',
  });
}

export async function POST(req: NextRequest) {
  const p = await requirePartner(req, 'manager');
  if (p instanceof NextResponse) return p;

  const body = await req.json().catch(() => ({}));
  if (!body.title || String(body.title).trim().length < 3) {
    return NextResponse.json({ error: 'Informe um título com pelo menos 3 caracteres' }, { status: 400 });
  }

  const submit = body.submit === true; // publicar já para análise
  const fields = pickEditable(body);

  // Coerência do tipo de vantagem: um desconto percentual sem percentual
  // configurado geraria um benefício inutilizável no balcão.
  const type = (fields.benefit_type as string) ?? 'percent_discount';
  if (type === 'percent_discount' && !fields.discount_percent) {
    return NextResponse.json({ error: 'Informe o percentual de desconto' }, { status: 400 });
  }
  if ((type === 'fixed_discount' || type === 'cashback') && !fields.discount_value) {
    return NextResponse.json({ error: 'Informe o valor do desconto' }, { status: 400 });
  }
  if (fields.discount_percent != null && (Number(fields.discount_percent) <= 0 || Number(fields.discount_percent) > 100)) {
    return NextResponse.json({ error: 'O percentual deve ficar entre 1 e 100' }, { status: 400 });
  }
  if (fields.starts_at && fields.ends_at && String(fields.ends_at) <= String(fields.starts_at)) {
    return NextResponse.json({ error: 'A data final deve ser posterior à inicial' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from('benefits')
    .insert({
      ...fields,
      partner_id: p.partnerId,
      status: submit ? 'pending' : 'draft',
      requires_approval: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Unidades participantes (vazio = todas as unidades do parceiro).
  const unitIds: string[] = Array.isArray(body.unit_ids) ? body.unit_ids : [];
  if (unitIds.length) {
    const own = await db.from('partner_units').select('id').eq('partner_id', p.partnerId);
    const valid = unitIds.filter((id) => (own.data ?? []).some((u) => u.id === id));
    if (valid.length) {
      await db.from('benefit_units').insert(valid.map((unit_id) => ({ benefit_id: data.id, unit_id })));
    }
  }

  return NextResponse.json({ benefit: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const p = await requirePartner(req, 'manager');
  if (p instanceof NextResponse) return p;

  const body = await req.json().catch(() => ({}));
  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: 'Informe o benefício' }, { status: 400 });

  const db = getServiceClient();

  // Confirma a posse antes de qualquer escrita.
  const { data: current } = await db
    .from('benefits')
    .select('id, partner_id, status')
    .eq('id', id)
    .eq('partner_id', p.partnerId)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ error: 'Benefício não encontrado nesta empresa' }, { status: 404 });
  }

  const patch: Record<string, unknown> = { ...pickEditable(body), updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!PARTNER_ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json(
        { error: 'Aprovação e rejeição são feitas pela equipe COMPREOUVENDA. Você pode salvar como rascunho, enviar para análise ou pausar.' },
        { status: 403 }
      );
    }
    // Reenviar um benefício rejeitado limpa o motivo anterior.
    if (body.status === 'pending' && current.status === 'rejected') {
      patch.rejection_reason = null;
    }
    // Editar um benefício já aprovado o devolve para análise: a alteração
    // precisa ser revista antes de voltar ao ar.
    patch.status = body.status;
  } else if (current.status === 'approved' && Object.keys(pickEditable(body)).length > 0) {
    patch.status = 'pending';
    patch.approved_at = null;
  }

  const { data, error } = await db.from('benefits').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (Array.isArray(body.unit_ids)) {
    await db.from('benefit_units').delete().eq('benefit_id', id);
    const own = await db.from('partner_units').select('id').eq('partner_id', p.partnerId);
    const valid = (body.unit_ids as string[]).filter((u) => (own.data ?? []).some((o) => o.id === u));
    if (valid.length) {
      await db.from('benefit_units').insert(valid.map((unit_id) => ({ benefit_id: id, unit_id })));
    }
  }

  return NextResponse.json({
    benefit: data,
    message: patch.status === 'pending' && current.status === 'approved'
      ? 'Benefício enviado para nova análise — ele volta ao ar após a aprovação.'
      : undefined,
  });
}
