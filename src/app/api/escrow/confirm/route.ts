import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { confirmDelivery } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json() as { orderId?: string; qrToken?: string; deviceFingerprint?: string };
    const { orderId, qrToken, deviceFingerprint } = body;

    if (!orderId || !qrToken) {
      return NextResponse.json({ error: 'orderId e qrToken são obrigatórios' }, { status: 400 });
    }

    // Get buyer's internal user ID
    const { data: buyer } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!buyer) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    const result = await confirmDelivery(orderId, buyer.id, qrToken, ip, deviceFingerprint);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Entrega confirmada! Pagamento liberado.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
