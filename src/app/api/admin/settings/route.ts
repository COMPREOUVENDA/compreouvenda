import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, requireAdmin, type AdminIdentity } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Configurações da plataforma.
 *
 * A tabela real é `system_settings` (a UI antiga gravava em `settings`, que não
 * existe — o upsert falhava em silêncio e nada era persistido).
 */

// Limites de sanidade: impedem que um valor absurdo quebre o checkout.
const BOUNDS: Record<string, { min: number; max: number; label: string }> = {
  platform_fee_percent: { min: 0, max: 50, label: 'Taxa da plataforma (%)' },
  commission_min_percent: { min: 0, max: 100, label: 'Comissão mínima (%)' },
  commission_max_percent: { min: 0, max: 100, label: 'Comissão máxima (%)' },
  max_photos_per_product: { min: 1, max: 30, label: 'Fotos por produto' },
  max_video_duration_seconds: { min: 5, max: 300, label: 'Duração do vídeo (s)' },
  video_generation_daily_limit: { min: 0, max: 100, label: 'Vídeos por dia' },
  max_negotiation_radius_km: { min: 1, max: 1000, label: 'Raio de negociação (km)' },
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const admin = getServiceClient();
  const { data, error } = await admin
    .from('system_settings')
    .select('key, value, description')
    .order('key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    settings: (data ?? []).map((s) => ({
      key: s.key,
      value: s.value,
      description: s.description,
      label: BOUNDS[s.key]?.label ?? s.key,
      min: BOUNDS[s.key]?.min ?? null,
      max: BOUNDS[s.key]?.max ?? null,
    })),
    canEdit: ['super_admin', 'admin_operational'].includes((auth as AdminIdentity).role),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req, ['super_admin', 'admin_operational']);
  if (auth instanceof NextResponse) return auth;
  const identity = auth as AdminIdentity;

  const body = await req.json().catch(() => ({}));
  const { settings } = body as { settings?: Record<string, unknown> };

  if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) {
    return NextResponse.json({ error: 'Nada para salvar' }, { status: 400 });
  }

  const admin = getServiceClient();

  // Só aceitamos chaves que já existem — a UI não cria configuração nova.
  const { data: current } = await admin.from('system_settings').select('key, value');
  const known = new Map((current ?? []).map((s) => [s.key, s.value]));

  const updates: { key: string; value: number }[] = [];
  for (const [key, raw] of Object.entries(settings)) {
    if (!known.has(key)) {
      return NextResponse.json({ error: `Configuração desconhecida: ${key}` }, { status: 400 });
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      return NextResponse.json({ error: `Valor inválido para ${key}` }, { status: 400 });
    }
    const b = BOUNDS[key];
    if (b && (num < b.min || num > b.max)) {
      return NextResponse.json(
        { error: `${b.label} deve ficar entre ${b.min} e ${b.max}` },
        { status: 400 }
      );
    }
    updates.push({ key, value: num });
  }

  // A comissão mínima nunca pode superar a máxima.
  const min = updates.find((u) => u.key === 'commission_min_percent')?.value
    ?? Number(known.get('commission_min_percent'));
  const max = updates.find((u) => u.key === 'commission_max_percent')?.value
    ?? Number(known.get('commission_max_percent'));
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
    return NextResponse.json(
      { error: 'A comissão mínima não pode ser maior que a máxima' },
      { status: 400 }
    );
  }

  for (const u of updates) {
    const { error } = await admin
      .from('system_settings')
      .update({ value: u.value, updated_at: new Date().toISOString() })
      .eq('key', u.key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await admin.from('audit_logs').insert({
      actor_id: identity.id,
      actor_email: identity.email,
      action: 'settings_updated',
      target_type: 'system_settings',
      details: Object.fromEntries(updates.map((u) => [u.key, u.value])),
    });
  } catch {
    // ignorado de propósito
  }

  const { data } = await admin.from('system_settings').select('key, value').order('key');
  return NextResponse.json({ settings: data ?? [], updated: updates.length });
}
