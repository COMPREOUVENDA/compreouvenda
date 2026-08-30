import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Instrumentação de campanhas do clube.
 *
 * Esta rota é a razão de `impressions`, `clicks` e `ctr` deixarem de ser `null`
 * no painel administrativo e no Portal do Parceiro. Antes dela, a tabela
 * `campaign_metrics` nunca recebia uma linha: as campanhas existiam, mas nada
 * no produto media exibição ou clique.
 *
 * Agregação por dia (`UNIQUE (campaign_id, metric_date)`) em vez de um registro
 * por evento: o volume de impressões de uma vitrine cresce rápido e não há
 * pergunta de negócio que exija o instante de cada exibição.
 *
 * LGPD: nenhum identificador de pessoa é gravado. Só o contador do dia.
 */

const EVENTOS = ['impression', 'click'] as const;
type Evento = (typeof EVENTOS)[number];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const event = String(body.event ?? '') as Evento;
  if (!EVENTOS.includes(event)) {
    return NextResponse.json(
      { error: `Evento inválido. Use: ${EVENTOS.join(', ')}` },
      { status: 400 }
    );
  }

  // Aceita um lote de campanhas: a vitrine exibe vários banners de uma vez.
  const ids: string[] = Array.isArray(body.campaign_ids)
    ? body.campaign_ids.map(String)
    : body.campaign_id
      ? [String(body.campaign_id)]
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Informe ao menos uma campanha' }, { status: 400 });
  }
  if (ids.length > 20) {
    return NextResponse.json({ error: 'Lote muito grande (máximo 20 campanhas)' }, { status: 400 });
  }

  const db = getServiceClient();

  // Só contabiliza campanha que existe e está ativa — evita que um cliente
  // forjado infle a métrica de qualquer uuid.
  const { data: validas } = await db
    .from('partner_campaigns')
    .select('id')
    .in('id', ids)
    .eq('status', 'active');

  const alvos = (validas ?? []).map((c) => c.id as string);
  if (alvos.length === 0) {
    return NextResponse.json({ tracked: 0 });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const coluna = event === 'impression' ? 'impressions' : 'clicks';

  let tracked = 0;
  for (const campaignId of alvos) {
    const { data: atual } = await db
      .from('campaign_metrics')
      .select('id, impressions, clicks')
      .eq('campaign_id', campaignId)
      .eq('metric_date', hoje)
      .maybeSingle();

    if (atual) {
      const valor = (event === 'impression' ? atual.impressions : atual.clicks) ?? 0;
      const { error } = await db
        .from('campaign_metrics')
        .update({ [coluna]: valor + 1 })
        .eq('id', atual.id);
      if (!error) tracked++;
    } else {
      const { error } = await db
        .from('campaign_metrics')
        .insert({
          campaign_id: campaignId,
          metric_date: hoje,
          impressions: event === 'impression' ? 1 : 0,
          clicks: event === 'click' ? 1 : 0,
        });
      // Corrida na criação da linha do dia: a segunda tentativa vira update.
      if (error && /duplicate key|unique/i.test(error.message)) {
        const { data: agora } = await db
          .from('campaign_metrics')
          .select('id, impressions, clicks')
          .eq('campaign_id', campaignId)
          .eq('metric_date', hoje)
          .maybeSingle();
        if (agora) {
          const valor = (event === 'impression' ? agora.impressions : agora.clicks) ?? 0;
          await db.from('campaign_metrics').update({ [coluna]: valor + 1 }).eq('id', agora.id);
          tracked++;
        }
      } else if (!error) {
        tracked++;
      }
    }
  }

  return NextResponse.json({ tracked, event, date: hoje });
}
