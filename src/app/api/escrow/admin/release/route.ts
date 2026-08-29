import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';
import { releasePayment } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    // Liberar dinheiro retido é uma operação financeira.
    const admin = await requireAdmin(req, ['admin_financial']);
    if (admin instanceof NextResponse) return admin;

    const supabase = getServiceClient();

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
