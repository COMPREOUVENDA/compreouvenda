import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Métricas reais dos recursos que ainda não foram lançados ao público:
 * leilões, ofertas relâmpago e vídeos de produto.
 *
 * As telas correspondentes exibiam números fixos escritos no código
 * ("127 leilões", "R$ 89.3K", "1.892 vídeos gerados"). Números inventados em
 * um painel administrativo são pior do que nenhum número: levam a decisão
 * errada e destroem a confiança em todo o resto do painel.
 *
 * Aqui devolvemos a contagem real — que hoje é zero — junto com `launched`,
 * para a tela poder dizer com todas as letras que o recurso ainda não entrou
 * em operação.
 */

const RECURSOS = {
  auctions: { tabela: 'auction_bids', rotulo: 'Leilões' },
  flash_offers: { tabela: 'flash_offers', rotulo: 'Ofertas Relâmpago' },
  videos: { tabela: 'product_videos', rotulo: 'Vídeos de Produto' },
} as const;

type Recurso = keyof typeof RECURSOS;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const feature = searchParams.get('feature') as Recurso | null;

  if (!feature || !(feature in RECURSOS)) {
    return NextResponse.json(
      { error: `Recurso inválido. Use: ${Object.keys(RECURSOS).join(', ')}` },
      { status: 400 }
    );
  }

  const db = getServiceClient();
  const { tabela, rotulo } = RECURSOS[feature];

  const { count, error } = await db.from(tabela).select('id', { count: 'exact', head: true });

  if (error) {
    // Tabela ausente não é erro de servidor: é recurso não implantado.
    return NextResponse.json({
      feature,
      label: rotulo,
      launched: false,
      total: 0,
      items: [],
      note: 'A estrutura deste recurso ainda não existe no banco de dados.',
    });
  }

  const total = count ?? 0;

  if (total === 0) {
    return NextResponse.json({
      feature,
      label: rotulo,
      launched: false,
      total: 0,
      items: [],
      note: 'Recurso ainda não lançado — nenhum registro em operação.',
    });
  }

  // Há dados reais: devolve os registros recentes para a tela listar.
  const { data } = await db
    .from(tabela)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    feature,
    label: rotulo,
    launched: true,
    total,
    items: data ?? [],
    note: null,
  });
}
