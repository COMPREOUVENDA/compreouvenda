import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Converte array de objetos em CSV
function toCSV(rows: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key] ?? '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'users';

  // Autenticação via cookie/header
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let csv = '';
  let filename = `${type}_${new Date().toISOString().split('T')[0]}.csv`;

  if (type === 'users') {
    const { data } = await supabase
      .from('users')
      .select('id, name, email, type, city, state, subscription_plan, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);
    csv = toCSV(data || [], [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email' },
      { key: 'type', label: 'Tipo' },
      { key: 'city', label: 'Cidade' },
      { key: 'state', label: 'Estado' },
      { key: 'subscription_plan', label: 'Plano' },
      { key: 'created_at', label: 'Cadastro' },
    ]);
  } else if (type === 'products') {
    const { data } = await supabase
      .from('products')
      .select('id, title, price, condition, status, city, state, views_count, favorites_count, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);
    csv = toCSV(data || [], [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Título' },
      { key: 'price', label: 'Preço' },
      { key: 'condition', label: 'Condição' },
      { key: 'status', label: 'Status' },
      { key: 'city', label: 'Cidade' },
      { key: 'state', label: 'Estado' },
      { key: 'views_count', label: 'Visualizações' },
      { key: 'favorites_count', label: 'Favoritos' },
      { key: 'created_at', label: 'Criado em' },
    ]);
  } else if (type === 'orders') {
    const { data } = await supabase
      .from('orders')
      .select('id, product_id, buyer_id, seller_id, amount, payment_method, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10000);
    csv = toCSV(data || [], [
      { key: 'id', label: 'ID' },
      { key: 'product_id', label: 'Produto ID' },
      { key: 'buyer_id', label: 'Comprador ID' },
      { key: 'seller_id', label: 'Vendedor ID' },
      { key: 'amount', label: 'Valor (R$)' },
      { key: 'payment_method', label: 'Pagamento' },
      { key: 'payment_status', label: 'Status' },
      { key: 'created_at', label: 'Data' },
    ]);
  } else if (type === 'coupons') {
    const { data } = await supabase
      .from('coupons')
      .select('code, description, type, value, usage_count, usage_limit, valid_until, active, created_at')
      .order('created_at', { ascending: false });
    csv = toCSV(data || [], [
      { key: 'code', label: 'Código' },
      { key: 'description', label: 'Descrição' },
      { key: 'type', label: 'Tipo' },
      { key: 'value', label: 'Valor' },
      { key: 'usage_count', label: 'Usos' },
      { key: 'usage_limit', label: 'Limite' },
      { key: 'valid_until', label: 'Válido até' },
      { key: 'active', label: 'Ativo' },
      { key: 'created_at', label: 'Criado em' },
    ]);
  } else {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
