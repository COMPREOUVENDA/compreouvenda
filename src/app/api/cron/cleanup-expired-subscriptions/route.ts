import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(req: NextRequest) {
  // Verificar autenticação do cron
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Remover subscriptions criadas há mais de 60 dias sem atividade
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const { data: deleted, error } = await supabase
    .from('push_subscriptions')
    .delete()
    .lt('updated_at', cutoff.toISOString())
    .select('id');

  if (error) {
    console.error('[cron/cleanup-expired-subscriptions] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = deleted?.length || 0;
  console.log(`[cron] Cleaned up ${count} expired push subscriptions`);

  return NextResponse.json({
    success: true,
    removed: count,
    cutoffDate: cutoff.toISOString(),
  });
}
