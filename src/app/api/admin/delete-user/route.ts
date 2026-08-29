import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  try {
    // Remoção definitiva de conta é destrutiva: restrita a super_admin.
    const admin = await requireAdmin(req, []);
    if (admin instanceof NextResponse) return admin;
    if (admin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Apenas um super_admin pode excluir contas', role: admin.role },
        { status: 403 }
      );
    }

    const { userId, authId, reason } = await req.json() as {
      userId: string;
      authId: string;
      reason?: string;
    };

    if (!userId || !authId) {
      return NextResponse.json({ error: 'userId and authId are required' }, { status: 400 });
    }

    const supabaseAdmin = getServiceClient();
    // 1. Delete favorites
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId);

    // 2. Delete reviews by this user
    await supabaseAdmin.from('reviews').delete().eq('reviewer_id', userId);

    // 3. Mark products as removed
    await supabaseAdmin
      .from('products')
      .update({ status: 'removed', seller_id: null })
      .eq('seller_id', userId);

    // Also update products where user_id is the owner
    await supabaseAdmin
      .from('products')
      .update({ status: 'removed' })
      .eq('user_id', userId);

    // 4. Delete push subscriptions
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId);

    // 5. Delete user record
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // 6. Delete auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authId);
    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
