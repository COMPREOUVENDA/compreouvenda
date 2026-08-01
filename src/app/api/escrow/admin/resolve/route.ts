import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getServiceClient } from '@/lib/api-auth';
import { resolveDispute } from '@/lib/escrow';

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getAuthUserId(req);

    if (!authUserId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verify admin — `is_active` precisa ser checado, senão um admin
    // desativado continua conseguindo resolver disputas.
    const supabase = getServiceClient();
    const { data: admin } = await supabase
      .from('admin_users')
      .select('id, is_active')
      .eq('auth_id', authUserId)
      .eq('is_active', true)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json() as {
      disputeId?: string;
      resolution?: 'release_seller' | 'refund_buyer' | 'split';
      splitSellerPercent?: number;
      adminNotes?: string;
    };
    const { disputeId, resolution, splitSellerPercent, adminNotes } = body;

    if (!disputeId || !resolution) {
      return NextResponse.json({ error: 'disputeId e resolution são obrigatórios' }, { status: 400 });
    }

    if (resolution === 'split' && (splitSellerPercent === undefined || splitSellerPercent < 0 || splitSellerPercent > 100)) {
      return NextResponse.json({ error: 'splitSellerPercent deve ser entre 0 e 100' }, { status: 400 });
    }

    const result = await resolveDispute(disputeId, admin.id, resolution, splitSellerPercent, adminNotes);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Disputa resolvida com sucesso.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
