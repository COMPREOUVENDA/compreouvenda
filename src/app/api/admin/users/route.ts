import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// -----------------------------------------------
// GET /api/admin/users — list users with filters
// -----------------------------------------------
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50')));
  const offset = (page - 1) * limit;

  const search = sp.get('search') ?? '';
  const verificationStatus = sp.get('verification_status');
  const type = sp.get('type');
  const status = sp.get('status');
  const isPro = sp.get('is_pro');
  const scoreMin = sp.get('score_min') ? parseInt(sp.get('score_min')!) : null;
  const scoreMax = sp.get('score_max') ? parseInt(sp.get('score_max')!) : null;
  const dateFrom = sp.get('date_from');
  const dateTo = sp.get('date_to');

  try {
    let query = supabase
      .from('users')
      .select(
        `id, auth_id, name, email, type, role, city, state, is_pro, created_at,
         status, verification_status, trust_score, kyc_status,
         document_front_url, document_back_url, selfie_url,
         birth_date, verified_at, rejection_reason,
         ip_address, registration_ip, last_activity_at, phone, document, avatar_url`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (verificationStatus && verificationStatus !== 'all') {
      query = query.eq('verification_status', verificationStatus);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (isPro === 'true') {
      query = query.eq('is_pro', true);
    } else if (isPro === 'false') {
      query = query.eq('is_pro', false);
    }
    if (scoreMin !== null) {
      query = query.gte('trust_score', scoreMin);
    }
    if (scoreMax !== null) {
      query = query.lte('trust_score', scoreMax);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59Z');
    }

    const { data: users, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute stats
    const { data: statsData } = await supabase
      .from('users')
      .select('verification_status, trust_score, status');

    const all = statsData ?? [];
    const stats = {
      total: all.length,
      approved: all.filter((u) => u.verification_status === 'approved').length,
      pending: all.filter((u) => u.verification_status === 'pending').length,
      rejected: all.filter((u) => u.verification_status === 'rejected').length,
      avg_trust_score: all.length > 0
        ? Math.round(all.reduce((acc, u) => acc + (u.trust_score ?? 0), 0) / all.length)
        : 0,
      alerts: all.filter(
        (u) => (u.trust_score ?? 0) < 20 || u.status === 'blocked'
      ).length,
    };

    return NextResponse.json({ users, total: count ?? 0, stats });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// -----------------------------------------------
// PATCH /api/admin/users — update single user
// -----------------------------------------------
export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json().catch(() => null);

  if (!body || !body.userId || !body.action) {
    return NextResponse.json({ error: 'userId e action são obrigatórios' }, { status: 400 });
  }

  const { userId, action, reason, justification } = body as {
    userId: string;
    action: 'approve' | 'reject' | 'suspend' | 'block';
    reason?: string;
    justification?: string;
  };

  // Fetch current user state
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('verification_status, status')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  let updates: Record<string, unknown> = {};
  let newVerificationStatus: string | null = null;

  switch (action) {
    case 'approve':
      updates = {
        verification_status: 'approved',
        status: 'verified',
        verified_at: new Date().toISOString(),
      };
      newVerificationStatus = 'approved';
      break;
    case 'reject':
      if (!reason) {
        return NextResponse.json({ error: 'Motivo obrigatório para reprovar' }, { status: 400 });
      }
      updates = {
        verification_status: 'rejected',
        status: 'suspended',
        rejection_reason: reason,
      };
      newVerificationStatus = 'rejected';
      break;
    case 'suspend':
      updates = { status: 'suspended' };
      break;
    case 'block':
      updates = { status: 'blocked' };
      break;
    default:
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert verification history if status changed
  if (newVerificationStatus) {
    await supabase.from('user_verification_history').insert({
      user_id: userId,
      old_status: user.verification_status,
      new_status: newVerificationStatus,
      reason: reason ?? justification ?? null,
    });
  }

  return NextResponse.json({ success: true });
}

// -----------------------------------------------
// POST /api/admin/users — bulk actions
// -----------------------------------------------
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const body = await req.json().catch(() => null);

  if (!body || !body.action || !Array.isArray(body.userIds) || body.userIds.length === 0) {
    return NextResponse.json(
      { error: 'action e userIds[] são obrigatórios' },
      { status: 400 }
    );
  }

  const { action, userIds, reason } = body as {
    action: 'bulk_approve' | 'bulk_reject';
    userIds: string[];
    reason?: string;
  };

  if (action === 'bulk_reject' && !reason) {
    return NextResponse.json({ error: 'Motivo obrigatório para reprovar' }, { status: 400 });
  }

  const updates =
    action === 'bulk_approve'
      ? { verification_status: 'approved', status: 'verified', verified_at: new Date().toISOString() }
      : { verification_status: 'rejected', status: 'suspended', rejection_reason: reason };

  const { error } = await supabase.from('users').update(updates).in('id', userIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert history entries for all affected users
  const historyEntries = userIds.map((uid) => ({
    user_id: uid,
    old_status: 'pending',
    new_status: action === 'bulk_approve' ? 'approved' : 'rejected',
    reason: reason ?? null,
  }));

  await supabase.from('user_verification_history').insert(historyEntries);

  return NextResponse.json({ success: true, affected: userIds.length });
}
