import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Campanhas ativas para o banner da vitrine do clube.
 *
 * A segmentação por cidade/estado/categoria é resolvida no servidor: o cliente
 * não recebe campanhas que não são para ele. `target_cities` vazio significa
 * "sem restrição geográfica", não "nenhuma cidade".
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city')?.trim().toLowerCase() || null;
  const state = searchParams.get('state')?.trim().toLowerCase() || null;
  const limit = Math.min(Number(searchParams.get('limit') ?? 6), 20);

  const agora = new Date().toISOString();
  const db = getServiceClient();

  const { data, error } = await db
    .from('partner_campaigns')
    .select(`
      id, title, description, campaign_type, image_url, target_url,
      target_cities, target_states, target_categories, priority,
      starts_at, ends_at, benefit_id,
      partner:partners!inner(id, trade_name, legal_name, logo_url, status)
    `)
    .eq('status', 'active')
    .eq('partners.status', 'approved')
    .or(`starts_at.is.null,starts_at.lte.${agora}`)
    .or(`ends_at.is.null,ends_at.gte.${agora}`)
    .order('priority', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const alcanca = (alvos: string[] | null, valor: string | null) => {
    if (!alvos || alvos.length === 0) return true; // sem restrição
    if (!valor) return false; // campanha restrita e não sabemos onde o usuário está
    return alvos.some((a) => a.trim().toLowerCase() === valor);
  };

  const campaigns = (data ?? [])
    .filter((c) => alcanca(c.target_cities as string[] | null, city))
    .filter((c) => alcanca(c.target_states as string[] | null, state))
    .slice(0, limit)
    .map((c) => {
      const partner = Array.isArray(c.partner) ? c.partner[0] : c.partner;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        campaign_type: c.campaign_type,
        image_url: c.image_url,
        target_url: c.target_url,
        benefit_id: c.benefit_id,
        partner: partner
          ? { id: partner.id, name: partner.trade_name || partner.legal_name, logo_url: partner.logo_url }
          : null,
      };
    });

  return NextResponse.json({ campaigns, total: campaigns.length });
}
