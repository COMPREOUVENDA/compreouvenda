import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markAsDelivered, regenerateQR } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json() as { orderId?: string; regenerate?: boolean };
    const { orderId, regenerate } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    const { data: seller } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    const result = regenerate
      ? await regenerateQR(orderId, seller.id)
      : await markAsDelivered(orderId, seller.id, ip);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: regenerate ? 'QR Code regenerado.' : 'Entrega marcada. QR Code gerado.',
      qrImageURL: result.data?.qrImageURL,
      qrExpiresAt: result.data?.qrExpiresAt,
      autoReleaseAt: result.data?.autoReleaseAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
