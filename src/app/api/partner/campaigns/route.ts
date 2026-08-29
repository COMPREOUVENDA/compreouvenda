import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requirePartner } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Campanhas e publicidade da própria empresa.
 *
 * Assim como os benefícios, a ativação é decidida pelo administrador. O
 * parceiro transita apenas entre draft/pending/paused e pode encerrar
 * (`finished`) uma campanha que já esteja no ar.
 */

const PARTNER_ALLOWED_STATUS = ['draft', 'pending', 'paused', 'finished'] as const;

const EDITABLE = [
  'title', 'description', 'campaign_type', 'benefit_id', 'image_url', 'target_url',
  'target_cities', 'target_states', 'target_categories', 'radius_km', 'latitude',
  'longitude', 'budget', 'cost_model', 'starts_at', 'ends_at',
] as const;

function pickEditable(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of EDITABLE) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

export async function GET(req: NextRequest) {
  const p = await requirePartner(req, 'operator', false);
  if (p instanceof NextResponse) return p;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const db = getServiceClient();
  let q = db.from('partner_campaigns')
    .select('*, benefit:benefits(id, title)')
    .eq('partner_id', p.partnerId)
    .order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((c) => c.id);
  const { data: metrics } = ids.length
    ? await db.from('campaign_metrics')
      .select('campaign_id, impressions, reach, clicks, conversions, redemptions, revenue')
      .in('campaign_id', ids)
    : { data: [] as Record<string, number | string>[] };

  const rows = (data ?? []).map((c) => {
    const ms = (metrics ?? []).filter((m) => m.campaign_id === c.id);
    // Sem linhas de métrica a campanha não foi medida — devolvemos null em vez
    // de zero, para a UI não sugerir "desempenho zero" onde há "sem medição".
    if (!ms.length) {
      return { ...c, impressions: null, reach: null, clicks: null, ctr: null, conversions: null, measured: false };
    }
    const s = (k: string) => ms.reduce((a, m) => a + Number((m as Record<string, unknown>)[k] ?? 0), 0);
    const impressions = s('impressions');
    const clicks = s('clicks');
    return {
      ...c,
      impressions,
      reach: s('reach'),
      clicks,
      conversions: s('conversions'),
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null,
      measured: true,
    };
  });

  return NextResponse.json({
    campaigns: rows,
    counts: {
      total: rows.length,
      active: rows.filter((c) => c.status === 'active').length,
      pending: rows.filter((c) => c.status === 'pending').length,
      draft: rows.filter((c) => c.status === 'draft').length,
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
  if (body.starts_at && body.ends_at && String(body.ends_at) <= String(body.starts_at)) {
    return NextResponse.json({ error: 'A data final deve ser posterior à inicial' }, { status: 400 });
  }

  const db = getServiceClient();

  // Campanha só pode apontar para um benefício da própria empresa.
  if (body.benefit_id) {
    const { data: b } = await db.from('benefits')
      .select('id').eq('id', body.benefit_id).eq('partner_id', p.partnerId).maybeSingle();
    if (!b) return NextResponse.json({ error: 'Benefício não encontrado nesta empresa' }, { status: 400 });
  }

  const { data, error } = await db
    .from('partner_campaigns')
    .insert({
      ...pickEditable(body),
      partner_id: p.partnerId,
      status: body.submit === true ? 'pending' : 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const p = await requirePartner(req, 'manager');
  if (p instanceof NextResponse) return p;

  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'Informe a campanha' }, { status: 400 });

  const db = getServiceClient();
  const { data: current } = await db.from('partner_campaigns')
    .select('id, status').eq('id', body.id).eq('partner_id', p.partnerId).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Campanha não encontrada nesta empresa' }, { status: 404 });

  const patch: Record<string, unknown> = { ...pickEditable(body), updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!PARTNER_ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json(
        { error: 'A ativação da campanha é feita pela equipe COMPREOUVENDA. Você pode salvar como rascunho, enviar para análise, pausar ou encerrar.' },
        { status: 403 }
      );
    }
    patch.status = body.status;
  }

  const { data, error } = await db.from('partner_campaigns')
    .update(patch).eq('id', body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ campaign: data });
}
