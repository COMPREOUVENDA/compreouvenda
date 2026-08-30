import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Programa de vendedores comissionados.
 *
 * A tela exibia "R$ 6.270 pagas / R$ 1.450 pendentes / R$ 4.820 disponíveis"
 * escritos no código. Esta rota devolve os valores reais da tabela
 * `commissions` — hoje zerados, porque o programa ainda não teve movimento.
 *
 * Zero apurado e zero inventado parecem iguais na tela, mas só um deles pode
 * ser auditado.
 *
 * Produto e revendedor são resolvidos em consultas separadas em vez de embed:
 * `commissions` referencia `users` por duas colunas (reseller_id e owner_id), e
 * um embed exigiria apontar o nome exato da constraint.
 */

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const db = getServiceClient();

  let q = db
    .from('commissions')
    .select('id, status, commission_type, commission_value, calculated_amount, created_at, product_id, reseller_id, owner_id, order_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const linhas = data ?? [];

  // Nomes de produto e de revendedor em duas consultas, não N.
  const productIds = Array.from(new Set(linhas.map((c) => c.product_id).filter(Boolean)));
  const userIds = Array.from(new Set(linhas.map((c) => c.reseller_id).filter(Boolean)));

  const [produtos, revendedores] = await Promise.all([
    productIds.length
      ? db.from('products').select('id, title').in('id', productIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    userIds.length
      ? db.from('users').select('id, name, email').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; name: string; email: string }[] }),
  ]);

  const mapaProduto = new Map((produtos.data ?? []).map((p) => [p.id, p.title]));
  const mapaUsuario = new Map((revendedores.data ?? []).map((u) => [u.id, u]));

  // Os totais consideram TODAS as comissões, não apenas a página listada.
  const { data: todas } = await db.from('commissions').select('status, calculated_amount');

  const soma = (aceita: (s: string) => boolean) =>
    (todas ?? [])
      .filter((c) => aceita(String(c.status)))
      .reduce((acc, c) => acc + Number(c.calculated_amount ?? 0), 0);

  return NextResponse.json({
    kpis: {
      total: (todas ?? []).length,
      paid: soma((s) => s === 'paid'),
      pending: soma((s) => s === 'pending'),
      available: soma((s) => s === 'available' || s === 'approved'),
    },
    commissions: linhas.map((c) => {
      const u = c.reseller_id ? mapaUsuario.get(c.reseller_id) : null;
      return {
        id: c.id,
        status: c.status,
        commission_type: c.commission_type,
        commission_value: c.commission_value,
        calculated_amount: c.calculated_amount,
        created_at: c.created_at,
        product_title: c.product_id ? mapaProduto.get(c.product_id) ?? null : null,
        reseller_name: u?.name ?? null,
        reseller_email: u?.email ?? null,
      };
    }),
  });
}
