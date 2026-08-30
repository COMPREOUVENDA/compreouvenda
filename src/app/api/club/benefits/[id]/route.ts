import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getPublicProfile, getServiceClient } from '@/lib/api-auth';
import { evaluateAvailability, benefitHighlight } from '@/lib/club';

export const dynamic = 'force-dynamic';

/**
 * Detalhe público de um benefício do clube.
 *
 * Além dos dados da oferta, devolve `my_redemption` quando o usuário
 * autenticado já tem um código pendente — assim a tela mostra o código em vez
 * de oferecer "gerar" de novo, e o usuário não fica com dois códigos na mão.
 *
 * Autenticação é opcional: sem sessão a página funciona normalmente, apenas
 * sem os campos pessoais.
 */

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getServiceClient();

  const { data: b, error } = await db
    .from('benefits')
    .select(`
      id, partner_id, title, description, benefit_type, discount_percent,
      discount_value, min_purchase_value, category, eligible_categories,
      image_url, terms, rules, starts_at, ends_at, valid_weekdays,
      valid_hour_start, valid_hour_end, total_quantity, used_quantity,
      status, audience, per_user_limit,
      partner:partners(id, trade_name, legal_name, category, description, logo_url, cover_url, website, instagram, phone, status, rating_avg, rating_count),
      benefit_units(unit_id)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!b) return NextResponse.json({ error: 'Benefício não encontrado' }, { status: 404 });

  const partner = Array.isArray(b.partner) ? b.partner[0] : b.partner;

  // Benefício não aprovado ou de parceiro não aprovado não existe para o
  // público — e a resposta não revela que ele existe em outro estado.
  if (b.status !== 'approved' || partner?.status !== 'approved') {
    return NextResponse.json({ error: 'Benefício não encontrado' }, { status: 404 });
  }

  const restrictedTo = (b.benefit_units ?? []).map((u: { unit_id: string }) => u.unit_id);

  let unitsQuery = db
    .from('partner_units')
    .select('id, name, street, number, neighborhood, city, state, zip_code, phone, opening_hours, latitude, longitude')
    .eq('partner_id', b.partner_id)
    .eq('is_active', true)
    .order('name');

  if (restrictedTo.length > 0) unitsQuery = unitsQuery.in('id', restrictedTo);

  const { data: units } = await unitsQuery;

  const disp = evaluateAvailability(b);

  // Contexto pessoal — só quando há sessão.
  let myRedemption: Record<string, unknown> | null = null;
  let alreadyUsed = 0;
  const authId = await getAuthUserId(req);
  if (authId) {
    const profile = await getPublicProfile(authId, 'id');
    if (profile?.id) {
      const { data: mine } = await db
        .from('benefit_redemptions')
        .select('id, code, status, expires_at, created_at, unit_id')
        .eq('benefit_id', b.id)
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle();
      myRedemption = mine ?? null;

      const { count } = await db
        .from('benefit_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('benefit_id', b.id)
        .eq('user_id', profile.id)
        .eq('status', 'validated');
      alreadyUsed = count ?? 0;
    }
  }

  return NextResponse.json({
    benefit: {
      id: b.id,
      title: b.title,
      description: b.description,
      benefit_type: b.benefit_type,
      highlight: benefitHighlight(b),
      discount_percent: b.discount_percent,
      discount_value: b.discount_value,
      min_purchase_value: b.min_purchase_value,
      category: b.category,
      image_url: b.image_url,
      terms: b.terms,
      rules: b.rules,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      valid_weekdays: b.valid_weekdays,
      valid_hour_start: b.valid_hour_start,
      valid_hour_end: b.valid_hour_end,
      audience: b.audience,
      premium_only: b.audience === 'premium',
      per_user_limit: b.per_user_limit,
      remaining: b.total_quantity == null ? null : Math.max(0, b.total_quantity - (b.used_quantity ?? 0)),
      available_now: disp.available,
      availability_note: disp.reason,
      partner: partner
        ? {
            id: partner.id,
            name: partner.trade_name || partner.legal_name,
            category: partner.category,
            description: partner.description,
            logo_url: partner.logo_url,
            cover_url: partner.cover_url,
            website: partner.website,
            instagram: partner.instagram,
            phone: partner.phone,
            rating_avg: partner.rating_avg,
            rating_count: partner.rating_count,
          }
        : null,
      units: units ?? [],
    },
    my_redemption: myRedemption,
    already_used: alreadyUsed,
    authenticated: !!authId,
  });
}
