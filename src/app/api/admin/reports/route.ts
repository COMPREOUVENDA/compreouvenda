import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Rótulos legíveis para o alvo de cada denúncia. O `reported_id` aponta para
// tabelas diferentes conforme o `reported_type`, então resolvemos em lote.
async function resolveTargets(
  admin: ReturnType<typeof getServiceClient>,
  rows: Array<{ reported_type: string; reported_id: string }>
) {
  const byType: Record<string, string[]> = { product: [], user: [], message: [] };
  for (const r of rows) {
    if (byType[r.reported_type] && !byType[r.reported_type].includes(r.reported_id)) {
      byType[r.reported_type].push(r.reported_id);
    }
  }

  const labels = new Map<string, string>();

  if (byType.product.length) {
    const { data } = await admin.from('products').select('id, title').in('id', byType.product);
    for (const p of data ?? []) labels.set(`product:${p.id}`, p.title ?? 'Produto removido');
  }
  if (byType.user.length) {
    const { data } = await admin.from('users').select('id, name, email').in('id', byType.user);
    for (const u of data ?? []) labels.set(`user:${u.id}`, u.name || u.email || 'Usuário');
  }
  if (byType.message.length) {
    const { data } = await admin.from('messages').select('id, content').in('id', byType.message);
    for (const m of data ?? []) {
      const preview = String(m.content ?? '').slice(0, 60);
      labels.set(`message:${m.id}`, preview || 'Mensagem');
    }
  }

  return labels;
}

/** Lista denúncias com filtro opcional por status. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_moderation', 'admin_support', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const status = req.nextUrl.searchParams.get('status');

  let query = admin
    .from('reports')
    .select('id, reporter_id, reported_type, reported_id, reason, description, status, resolved_by, resolved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') query = query.eq('status', status);

  const { data: reports, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = reports ?? [];

  // Denunciantes
  const reporterIds = Array.from(new Set(rows.map((r) => r.reporter_id).filter(Boolean)));
  const reporters = new Map<string, { name: string; email: string }>();
  if (reporterIds.length) {
    const { data } = await admin.from('users').select('id, name, email').in('id', reporterIds);
    for (const u of data ?? []) reporters.set(u.id, { name: u.name ?? '', email: u.email ?? '' });
  }

  const targets = await resolveTargets(admin, rows);

  const items = rows.map((r) => ({
    ...r,
    reporter_name: reporters.get(r.reporter_id)?.name || 'Usuário removido',
    reporter_email: reporters.get(r.reporter_id)?.email || '',
    target_label: targets.get(`${r.reported_type}:${r.reported_id}`) || '(registro não encontrado)',
  }));

  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    reviewing: rows.filter((r) => r.status === 'reviewing').length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
    dismissed: rows.filter((r) => r.status === 'dismissed').length,
  };

  return NextResponse.json({ reports: items, counts });
}

const VALID_STATUS = ['pending', 'reviewing', 'resolved', 'dismissed'] as const;

/** Atualiza o status de uma denúncia (moderação). */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, ['admin_moderation', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { id, status } = body as { id?: string; status?: string };

  if (!id || !status || !VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])) {
    return NextResponse.json({ error: 'Informe `id` e um `status` válido' }, { status: 400 });
  }

  const admin = getServiceClient();
  const isFinal = status === 'resolved' || status === 'dismissed';

  const { data, error } = await admin
    .from('reports')
    .update({
      status,
      resolved_by: isFinal ? identity.id : null,
      resolved_at: isFinal ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trilha de auditoria — não bloqueia a operação se falhar.
  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: `report_${status}`,
      target_type: 'report',
      target_id: id,
      details: { status },
    });
  } catch {
    // ignorado de propósito
  }

  return NextResponse.json({ report: data });
}
