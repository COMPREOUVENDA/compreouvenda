import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requirePartner } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** Unidades/filiais da própria empresa. */

const EDITABLE = [
  'name', 'street', 'number', 'complement', 'neighborhood', 'city', 'state',
  'zip_code', 'latitude', 'longitude', 'phone', 'opening_hours', 'is_active',
] as const;

function pickEditable(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of EDITABLE) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

export async function GET(req: NextRequest) {
  const p = await requirePartner(req, 'operator', false);
  if (p instanceof NextResponse) return p;

  const db = getServiceClient();
  const [units, redemptions] = await Promise.all([
    db.from('partner_units').select('*').eq('partner_id', p.partnerId).order('created_at'),
    db.from('benefit_redemptions').select('unit_id, purchase_value')
      .eq('partner_id', p.partnerId).eq('status', 'validated'),
  ]);

  const rows = (units.data ?? []).map((u) => {
    const rs = (redemptions.data ?? []).filter((r) => r.unit_id === u.id);
    return {
      ...u,
      redemptions: rs.length,
      volume: rs.reduce((a, r) => a + Number(r.purchase_value ?? 0), 0),
    };
  });

  return NextResponse.json({
    units: rows,
    canManage: p.partnerStatus === 'approved' && p.role !== 'operator',
  });
}

export async function POST(req: NextRequest) {
  const p = await requirePartner(req, 'manager');
  if (p instanceof NextResponse) return p;

  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.city || !body.state) {
    return NextResponse.json({ error: 'Nome, cidade e estado são obrigatórios' }, { status: 400 });
  }
  if (String(body.state).length !== 2) {
    return NextResponse.json({ error: 'Informe a UF com 2 letras (ex.: SP)' }, { status: 400 });
  }

  const { data, error } = await getServiceClient()
    .from('partner_units')
    .insert({ ...pickEditable(body), state: String(body.state).toUpperCase(), partner_id: p.partnerId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ unit: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const p = await requirePartner(req, 'manager');
  if (p instanceof NextResponse) return p;

  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'Informe a unidade' }, { status: 400 });

  const db = getServiceClient();
  // A cláusula por partner_id garante que só a própria unidade é alterada.
  const { data, error } = await db
    .from('partner_units')
    .update({ ...pickEditable(body), updated_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('partner_id', p.partnerId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Unidade não encontrada nesta empresa' }, { status: 404 });

  return NextResponse.json({ unit: data });
}
