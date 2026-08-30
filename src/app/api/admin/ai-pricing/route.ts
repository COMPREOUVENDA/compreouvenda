import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Painel de IA de Precificação.
 *
 * Substitui as três chamadas que a tela fazia direto do navegador para o
 * Supabase REST com a chave anônima. Aquele caminho tinha dois problemas:
 * dependia de RLS permissiva nas tabelas de IA para funcionar (e falhava em
 * silêncio quando não era), e ignorava por completo o `requireAdmin` que
 * protege todo o resto do painel.
 *
 * Também resolve os nomes reais das categorias: a tela mapeava ids '1' a '12',
 * mas `categories.id` é uuid — nenhuma categoria era resolvida, e todo card de
 * mercado aparecia como "Cat. <uuid>".
 */

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const db = getServiceClient();

  const [logs, suggestions, analytics, categories] = await Promise.all([
    db.from('ai_pricing_logs').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('price_suggestions').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('market_analytics').select('*').order('category', { ascending: true }),
    db.from('categories').select('id, name, slug').eq('is_active', true).order('sort_order'),
  ]);

  // Tabela ausente não derruba o painel: a seção correspondente fica vazia.
  const lista = <T,>(r: { data: T[] | null; error: unknown }): T[] => (r.error ? [] : r.data ?? []);

  const cats = lista(categories) as { id: string; name: string; slug: string }[];

  // `market_analytics.category` pode guardar o uuid ou o slug da categoria.
  const nomePorChave: Record<string, string> = {};
  for (const c of cats) {
    nomePorChave[c.id] = c.name;
    if (c.slug) nomePorChave[c.slug] = c.name;
  }

  const disponivel = {
    logs: !logs.error,
    suggestions: !suggestions.error,
    analytics: !analytics.error,
  };

  return NextResponse.json({
    logs: lista(logs),
    suggestions: lista(suggestions),
    analytics: lista(analytics),
    categories: cats,
    category_names: nomePorChave,
    available: disponivel,
  });
}
