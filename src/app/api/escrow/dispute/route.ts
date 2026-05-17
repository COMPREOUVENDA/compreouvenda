import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openDispute } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json() as {
      orderId?: string;
      reason?: string;
      description?: string;
      evidenceUrls?: string[];
    };
    const { orderId, reason, description, evidenceUrls } = body;

    if (!orderId || !reason) {
      return NextResponse.json({ error: 'orderId e reason são obrigatórios' }, { status: 400 });
    }

    const { data: buyer } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (!buyer) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    const result = await openDispute(orderId, buyer.id, reason, description ?? '', evidenceUrls ?? [], ip);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Disputa aberta. Nossa equipe entrará em contato em breve.',
      disputeId: result.data?.disputeId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
