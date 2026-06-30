import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Expirar produtos ativos há mais de 90 dias sem venda
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const { data: expired, error } = await supabase
    .from('products')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('created_at', cutoff.toISOString())
    .select('id, title, user_id');

  if (error) {
    console.error('[cron/expire-old-products] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = expired?.length || 0;
  console.log(`[cron] Expired ${count} old products`);

  return NextResponse.json({
    success: true,
    expired: count,
    cutoffDate: cutoff.toISOString(),
  });
}
