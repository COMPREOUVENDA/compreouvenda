import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'user_deleted'
  | 'user_blocked'
  | 'user_suspended'
  | 'user_reactivated'
  | 'account_deletion_requested'
  | 'account_deletion_cancelled';

interface LogAuditParams {
  actorId: string;
  actorEmail?: string;
  action: AuditAction;
  targetType: string;
  targetId?: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
}

export async function logAudit(
  supabase: SupabaseClient,
  params: LogAuditParams
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail ?? null,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      target_email: params.targetEmail ?? null,
      details: params.details ?? null,
    });
  } catch {
    // Audit log failures should not break main flow
  }
}
