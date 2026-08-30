import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Distribuição geográfica real do ecossistema.
 *
 * A tela exibia "8.412 usuários", "3.240 anúncios ativos" e um ranking fixo de
 * São Paulo, Rio e Belo Horizonte escritos no código — independentemente do que
 * houvesse no banco. Aqui tudo é apurado: usuários, produtos e unidades de
 * empresas parceiras, agrupados por cidade.
 *
 * `coverage` informa quantos registros têm cidade preenchida. Sem esse número,
 * um ranking pequeno poderia ser lido como "temos pouca gente" quando o caso
 * real é "quase ninguém preencheu a cidade".
 */

interface Agregado {
  city: string;
  state: string | null;
  users: number;
  products: number;
  partner_units: number;
}

const chave = (city: string, state: string | null) =>
  `${city.trim().toLowerCase()}|${(state ?? '').trim().toLowerCase()}`;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();

  const [usuarios, produtos, unidades, totalUsuarios, totalProdutos] = await Promise.all([
    db.from('users').select('city, state').not('city', 'is', null),
    db.from('products').select('city, state').not('city', 'is', null).eq('status', 'active'),
    db.from('partner_units').select('city, state').eq('is_active', true),
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const mapa = new Map<string, Agregado>();

  const somar = (
    linhas: { city: string | null; state: string | null }[] | null,
    campo: 'users' | 'products' | 'partner_units'
  ) => {
    for (const l of linhas ?? []) {
      const city = (l.city ?? '').trim();
      if (!city) continue;
      const k = chave(city, l.state);
      const atual = mapa.get(k) ?? { city, state: l.state, users: 0, products: 0, partner_units: 0 };
      atual[campo] += 1;
      mapa.set(k, atual);
    }
  };

  somar(usuarios.data, 'users');
  somar(produtos.data, 'products');
  somar(unidades.data, 'partner_units');

  const cidades = Array.from(mapa.values()).sort(
    (a, b) => b.users + b.products - (a.users + a.products)
  );

  // Estados derivam das cidades — não há segunda fonte de verdade.
  const porEstado = new Map<string, { state: string; users: number; products: number }>();
  for (const c of cidades) {
    const uf = (c.state ?? '').trim().toUpperCase() || 'Não informado';
    const atual = porEstado.get(uf) ?? { state: uf, users: 0, products: 0 };
    atual.users += c.users;
    atual.products += c.products;
    porEstado.set(uf, atual);
  }

  // Cidade em branco não é cidade: `.not('city','is',null)` deixa passar string
  // vazia, e contá-la aqui daria uma cobertura maior do que a soma do próprio
  // ranking — o mesmo tipo de número enganoso que esta tela veio corrigir.
  const comCidade = (linhas: { city: string | null }[] | null) =>
    (linhas ?? []).filter((l) => (l.city ?? '').trim() !== '').length;

  const usuariosComCidade = comCidade(usuarios.data);
  const produtosComCidade = comCidade(produtos.data);

  return NextResponse.json({
    kpis: {
      cities: cidades.length,
      states: porEstado.size,
      users_total: totalUsuarios.count ?? 0,
      products_total: totalProdutos.count ?? 0,
      partner_units: (unidades.data ?? []).length,
    },
    coverage: {
      users_with_city: usuariosComCidade,
      users_total: totalUsuarios.count ?? 0,
      products_with_city: produtosComCidade,
      products_total: totalProdutos.count ?? 0,
    },
    cities: cidades.slice(0, 20),
    states: Array.from(porEstado.values()).sort((a, b) => b.users - a.users).slice(0, 15),
  });
}
