import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/** Lista tickets de suporte com filtro opcional por status/prioridade. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_support', 'admin_operational', 'admin_moderation']);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const status = req.nextUrl.searchParams.get('status');
  const priority = req.nextUrl.searchParams.get('priority');

  let query = admin
    .from('support_tickets')
    .select('id, user_id, subject, description, category, priority, status, assigned_to, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') query = query.eq('status', status);
  if (priority && priority !== 'all') query = query.eq('priority', priority);

  const { data: tickets, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = tickets ?? [];

  // Autores dos tickets
  const userIds = Array.from(new Set(rows.map((t) => t.user_id).filter(Boolean)));
  const users = new Map<string, { name: string; email: string }>();
  if (userIds.length) {
    const { data } = await admin.from('users').select('id, name, email').in('id', userIds);
    for (const u of data ?? []) users.set(u.id, { name: u.name ?? '', email: u.email ?? '' });
  }

  // Admins responsáveis
  const adminIds = Array.from(new Set(rows.map((t) => t.assigned_to).filter(Boolean))) as string[];
  const admins = new Map<string, string>();
  if (adminIds.length) {
    const { data } = await admin.from('admin_users').select('id, name, email').in('id', adminIds);
    for (const a of data ?? []) admins.set(a.id, a.name || a.email || 'Admin');
  }

  const items = rows.map((t) => ({
    ...t,
    user_name: users.get(t.user_id)?.name || 'Usuário removido',
    user_email: users.get(t.user_id)?.email || '',
    assigned_name: t.assigned_to ? admins.get(t.assigned_to) || 'Admin' : null,
  }));

  const counts = {
    total: rows.length,
    open: rows.filter((t) => t.status === 'open').length,
    in_progress: rows.filter((t) => t.status === 'in_progress').length,
    waiting_user: rows.filter((t) => t.status === 'waiting_user').length,
    resolved: rows.filter((t) => t.status === 'resolved').length,
    closed: rows.filter((t) => t.status === 'closed').length,
    urgent: rows.filter((t) => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length,
  };

  return NextResponse.json({ tickets: items, counts });
}

const VALID_STATUS = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as const;
const VALID_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;

/** Atualiza status/prioridade ou assume a responsabilidade por um ticket. */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_support', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { id, status, priority, assign } = body as {
    id?: string;
    status?: string;
    priority?: string;
    assign?: boolean;
  };

  if (!id) return NextResponse.json({ error: 'Informe `id`' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status) {
    if (!VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }
    patch.status = status;
  }
  if (priority) {
    if (!VALID_PRIORITY.includes(priority as (typeof VALID_PRIORITY)[number])) {
      return NextResponse.json({ error: 'Prioridade inválida' }, { status: 400 });
    }
    patch.priority = priority;
  }
  if (assign === true) patch.assigned_to = identity.id;
  if (assign === false) patch.assigned_to = null;

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }

  const admin = getServiceClient();
  const { data, error } = await admin
    .from('support_tickets')
    .update(patch)
    .eq('id', id)
    .select('id, status, priority, assigned_to')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'support_ticket_updated',
      target_type: 'support_ticket',
      target_id: id,
      details: patch,
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ ticket: data });
}
