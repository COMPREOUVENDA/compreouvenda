import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/api-auth';
import { createEscrowTransaction } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getAuthUserId(req);

    if (!authUserId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json() as {
      orderId?: string;
      amount?: number;
      buyerId?: string;
      sellerId?: string;
    };
    const { orderId, amount, buyerId, sellerId } = body;

    if (!orderId || !amount || !buyerId || !sellerId) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 });
    }

    const result = await createEscrowTransaction(orderId, amount, buyerId, sellerId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, escrowId: result.data?.escrowId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
