import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { userId, authId, reason } = await req.json() as {
      userId: string;
      authId: string;
      reason?: string;
    };

    if (!userId || !authId) {
      return NextResponse.json({ error: 'userId and authId are required' }, { status: 400 });
    }

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the caller is an admin (check session via auth header)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
