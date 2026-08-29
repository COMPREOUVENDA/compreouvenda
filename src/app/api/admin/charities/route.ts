import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, isValidTaxId, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ROLES = ['admin_operational', 'admin_financial', 'admin_content'] as const;

/**
 * Instituições beneficentes do módulo solidário.
 *
 * `charities.total_received` e `supporters` são colunas acumuladoras; aqui elas
 * são reconciliadas com o que realmente existe em `donations`, para que o painel
 * nunca mostre um total que não bate com os lançamentos.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ROLES);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();

  const [charitiesRes, donationsRes] = await Promise.all([
    admin
      .from('charities')
      .select('id, name, description, logo_url, document, email, phone, pix_key, category, verified, active, total_received, supporters, created_at')
      .order('created_at', { ascending: false }),
    admin.from('donations').select('charity_id, donor_id, calculated_amount, donation_value, status'),
  ]);

  if (charitiesRes.error) return NextResponse.json({ error: charitiesRes.error.message }, { status: 500 });

  const donations = donationsRes.data ?? [];
  const amountOf = (d: { calculated_amount: number | null; donation_value: number | null }) =>
    Number(d.calculated_amount ?? d.donation_value ?? 0);

  const stats = new Map<string, { received: number; pending: number; count: number; donors: Set<string> }>();
  for (const d of donations) {
    if (!d.charity_id) continue;
    const s = stats.get(d.charity_id) ?? { received: 0, pending: 0, count: 0, donors: new Set<string>() };
    if (d.status === 'confirmed' || d.status === 'transferred') s.received += amountOf(d);
    if (d.status === 'pending') s.pending += amountOf(d);
    s.count += 1;
    if (d.donor_id) s.donors.add(d.donor_id);
    stats.set(d.charity_id, s);
  }

  const items = (charitiesRes.data ?? []).map((c) => {
    const s = stats.get(c.id);
    return {
      ...c,
      // Valores derivados dos lançamentos, não do contador denormalizado.
      real_received: s?.received ?? 0,
      pending_amount: s?.pending ?? 0,
      donations_count: s?.count ?? 0,
      donors_count: s?.donors.size ?? 0,
    };
  });

  return NextResponse.json({
    charities: items,
    counts: {
      total: items.length,
      active: items.filter((c) => c.active !== false).length,
      verified: items.filter((c) => c.verified).length,
    },
  });
}

/** Cadastra uma nova instituição. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { name, document, email, phone, description, logo_url, pix_key, category, verified, active } = body as Record<string, string | boolean | undefined>;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Informe o nome da instituição' }, { status: 400 });
  }
  // O CNPJ é o que dá rastreabilidade ao repasse — não aceitamos lixo.
  if (document && !isValidTaxId(String(document))) {
    return NextResponse.json({ error: 'CNPJ/CPF inválido' }, { status: 400 });
  }

  const admin = getServiceClient();
  const { data, error } = await admin
    .from('charities')
    .insert({
      name: String(name).trim(),
      document: document ? String(document).replace(/\D/g, '') : null,
      email: email ? String(email).trim() : null,
      phone: phone ? String(phone).trim() : null,
      description: description ? String(description).trim() : null,
      logo_url: logo_url ? String(logo_url).trim() : null,
      pix_key: pix_key ? String(pix_key).trim() : null,
      category: category ? String(category) : null,
      verified: verified === true,
      active: active !== false,
    })
    .select('id, name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'charity_created',
      target_type: 'charity',
      target_id: data.id,
      details: { name: data.name },
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ charity: data }, { status: 201 });
}

/** Atualiza dados, verificação ou situação de uma instituição. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, ROLES);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { id, ...rest } = body as Record<string, unknown>;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Informe `id`' }, { status: 400 });
  }

  const ALLOWED = ['name', 'description', 'logo_url', 'document', 'email', 'phone', 'pix_key', 'category', 'verified', 'active'];
  const patch: Record<string, unknown> = {};
  for (const k of ALLOWED) {
    if (rest[k] !== undefined) patch[k] = rest[k];
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }
  if (patch.document && !isValidTaxId(String(patch.document))) {
    return NextResponse.json({ error: 'CNPJ/CPF inválido' }, { status: 400 });
  }
  if (patch.document) patch.document = String(patch.document).replace(/\D/g, '');
  patch.updated_at = new Date().toISOString();

  const admin = getServiceClient();
  const { data, error } = await admin
    .from('charities')
    .update(patch)
    .eq('id', id)
    .select('id, name, verified, active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'charity_updated',
      target_type: 'charity',
      target_id: id,
      details: patch,
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ charity: data });
}

/** Remove uma instituição que ainda não recebeu doações. */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_operational']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Informe `id`' }, { status: 400 });

  const admin = getServiceClient();

  // Instituição com histórico não pode sumir: desative em vez de excluir.
  const { count } = await admin
    .from('donations')
    .select('id', { count: 'exact', head: true })
    .eq('charity_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Esta instituição possui ${count} doação(ões) registrada(s). Desative-a em vez de excluir.` },
      { status: 409 }
    );
  }

  const { error } = await admin.from('charities').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'charity_deleted',
      target_type: 'charity',
      target_id: id,
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ ok: true });
}
