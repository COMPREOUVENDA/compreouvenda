import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getServiceClient } from '@/lib/api-auth';
import { markAsShipped } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getAuthUserId(req);

    if (!authUserId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json() as { orderId?: string; trackingCode?: string; carrier?: string };
    const { orderId, trackingCode, carrier } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: seller } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authUserId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    const result = await markAsShipped(orderId, seller.id, trackingCode, carrier, ip);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Envio registrado com sucesso.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
