import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { releasePayment } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verify admin
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('auth_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json() as { orderId?: string; reason?: string };
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    // Update release reason before calling releasePayment
    await supabase
      .from('escrow_transactions')
      .update({ release_reason: reason ?? 'Liberação manual pelo admin' })
      .eq('order_id', orderId);

    const result = await releasePayment(orderId, admin.id, 'admin');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Pagamento liberado manualmente.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
