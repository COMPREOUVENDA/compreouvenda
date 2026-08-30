import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/api-auth';
import { evaluateAvailability, benefitHighlight } from '@/lib/club';

export const dynamic = 'force-dynamic';

/**
 * Vitrine pública do Clube de Benefícios.
 *
 * É a ponta que faltava no ciclo: o administrador aprova, o parceiro publica e
 * é AQUI que o benefício finalmente chega ao usuário.
 *
 * Regras de exposição (todas avaliadas no servidor, nunca no cliente):
 *   - benefício `approved` de parceiro `approved`;
 *   - dentro da janela de vigência e com estoque;
 *   - benefício restrito a assinantes só aparece marcado, nunca escondido —
 *     ver a oferta é parte do argumento para assinar.
 *
 * LGPD: nada aqui exige autenticação e nada aqui devolve dado pessoal.
 */

interface UnitRow {
  id: string;
  name: string;
  city: string;
  state: string;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city')?.trim() || null;
  const state = searchParams.get('state')?.trim() || null;
  const category = searchParams.get('category')?.trim() || null;
  const q = searchParams.get('q')?.trim() || null;
  const partnerId = searchParams.get('partner_id')?.trim() || null;
  const limit = Math.min(Number(searchParams.get('limit') ?? 40), 100);

  const db = getServiceClient();

  let query = db
    .from('benefits')
    .select(`
      id, title, description, benefit_type, discount_percent, discount_value,
      min_purchase_value, category, image_url, terms, starts_at, ends_at,
      valid_weekdays, valid_hour_start, valid_hour_end,
      total_quantity, used_quantity, status, audience, per_user_limit,
      partner:partners!inner(id, trade_name, legal_name, category, logo_url, status, rating_avg, rating_count),
      benefit_units(unit_id)
    `)
    .eq('status', 'approved')
    .eq('partners.status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (partnerId) query = query.eq('partner_id', partnerId);
  if (category) query = query.eq('category', category);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ benefits: [], total: 0, filters: { city, state, category, q } });
  }

  // Unidades de todos os parceiros da página, em uma única consulta.
  const partnerIds = Array.from(
    new Set(rows.map((b) => {
      const p = Array.isArray(b.partner) ? b.partner[0] : b.partner;
      return p?.id as string;
    }).filter(Boolean))
  );

  let unitsQuery = db
    .from('partner_units')
    .select('id, partner_id, name, city, state, neighborhood, street, number, latitude, longitude, is_active')
    .in('partner_id', partnerIds)
    .eq('is_active', true);

  if (city) unitsQuery = unitsQuery.ilike('city', city);
  if (state) unitsQuery = unitsQuery.ilike('state', state);

  const { data: units } = await unitsQuery;

  const unitsByPartner = new Map<string, UnitRow[]>();
  for (const u of units ?? []) {
    const list = unitsByPartner.get(u.partner_id as string) ?? [];
    list.push(u as unknown as UnitRow);
    unitsByPartner.set(u.partner_id as string, list);
  }

  const now = new Date();

  const benefits = rows.flatMap((b) => {
    const disp = evaluateAvailability(b, now);

    // Fora de vigência ou esgotado não vai para a vitrine. Restrição de dia ou
    // horário NÃO esconde a oferta — vira aviso de quando ela vale.
    const foraDeVigencia = !disp.available
      && disp.code !== 'invalid_weekday'
      && disp.code !== 'invalid_hour';
    if (foraDeVigencia) return [];

    const partner = Array.isArray(b.partner) ? b.partner[0] : b.partner;
    const restrictedTo = (b.benefit_units ?? []).map((u: { unit_id: string }) => u.unit_id);
    const todas = unitsByPartner.get(partner?.id as string) ?? [];

    // Sem vínculo explícito, o benefício vale em todas as unidades do parceiro.
    const unidades = restrictedTo.length > 0
      ? todas.filter((u) => restrictedTo.includes(u.id))
      : todas;

    // Filtrar por cidade só faz sentido se o parceiro tiver unidade lá.
    if ((city || state) && unidades.length === 0) return [];

    return [{
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
      ends_at: b.ends_at,
      audience: b.audience,
      premium_only: b.audience === 'premium',
      // null = ilimitado. Nunca 0 por ausência de limite.
      remaining: b.total_quantity == null ? null : Math.max(0, b.total_quantity - (b.used_quantity ?? 0)),
      available_now: disp.available,
      availability_note: disp.reason,
      partner: partner
        ? {
            id: partner.id,
            name: partner.trade_name || partner.legal_name,
            category: partner.category,
            logo_url: partner.logo_url,
            rating_avg: partner.rating_avg,
            rating_count: partner.rating_count,
          }
        : null,
      units: unidades.map((u) => ({
        id: u.id,
        name: u.name,
        city: u.city,
        state: u.state,
        neighborhood: u.neighborhood,
        latitude: u.latitude,
        longitude: u.longitude,
      })),
    }];
  })
    // Quem pode ser usado agora aparece primeiro.
    .sort((a, b) => Number(b.available_now) - Number(a.available_now));

  return NextResponse.json({
    benefits,
    total: benefits.length,
    filters: { city, state, category, q },
  });
}
