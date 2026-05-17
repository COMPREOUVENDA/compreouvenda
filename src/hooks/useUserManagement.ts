'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { calculateTrustScore } from '@/lib/trust-score';
import { detectDuplicates } from '@/lib/duplicate-detection';
import { logAudit } from '@/lib/audit';

export interface UserRow {
  id: string;
  auth_id?: string;
  name: string;
  email: string;
  type: string;
  role?: string;
  city?: string;
  state?: string;
  status?: string;
  is_pro?: boolean;
  created_at: string;
  // Verification / KYC
  verification_status?: 'approved' | 'pending' | 'rejected';
  trust_score?: number;
  kyc_status?: string;
  document_front_url?: string;
  document_back_url?: string;
  selfie_url?: string;
  birth_date?: string;
  verified_at?: string;
  rejection_reason?: string;
  ip_address?: string;
  registration_ip?: string;
  last_activity_at?: string;
  // Extra
  phone?: string;
  document?: string;
  avatar_url?: string;
}

export interface UserStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  avg_trust_score: number;
  alerts: number;
}

export interface UserFilters {
  search: string;
  verification_status: 'all' | 'approved' | 'pending' | 'rejected';
  type: 'all' | 'buyer' | 'seller' | 'charity';
  status: 'all' | 'active' | 'suspended' | 'blocked' | 'pending_deletion';
  is_pro: 'all' | 'true' | 'false';
  score_min: number;
  score_max: number;
  date_from: string;
  date_to: string;
}

export interface Pagination {
  page: number;
  total: number;
  perPage: number;
}

export const DEFAULT_FILTERS: UserFilters = {
  search: '',
  verification_status: 'all',
  type: 'all',
  status: 'all',
  is_pro: 'all',
  score_min: 0,
  score_max: 100,
  date_from: '',
  date_to: '',
};

export function useUserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    avg_trust_score: 0,
    alerts: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, perPage: 50 });

  const getAdminUser = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return null;
    const { data: profile } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('auth_id', authUser.id)
      .single();
    if (profile) return profile;
    // Fallback to users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, email')
      .eq('auth_id', authUser.id)
      .single();
    return userProfile;
  }, []);

  const fetchUsers = useCallback(async (overrideFilters?: Partial<UserFilters>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = { ...filters, ...overrideFilters };
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.perPage));
      if (f.search) params.set('search', f.search);
      if (f.verification_status !== 'all') params.set('verification_status', f.verification_status);
      if (f.type !== 'all') params.set('type', f.type);
      if (f.status !== 'all') params.set('status', f.status);
      if (f.is_pro !== 'all') params.set('is_pro', f.is_pro);
      if (f.score_min > 0) params.set('score_min', String(f.score_min));
      if (f.score_max < 100) params.set('score_max', String(f.score_max));
      if (f.date_from) params.set('date_from', f.date_from);
      if (f.date_to) params.set('date_to', f.date_to);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      setUsers(json.users ?? []);
      setPagination((prev) => ({ ...prev, total: json.total ?? 0 }));
      setStats(json.stats ?? { total: 0, approved: 0, pending: 0, rejected: 0, avg_trust_score: 0, alerts: 0 });
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.perPage]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const applyFilters = useCallback(
    (newFilters: Partial<UserFilters>) => {
      const updated = { ...filters, ...newFilters };
      setFilters(updated);
      setPagination((prev) => ({ ...prev, page: 1 }));
      fetchUsers(newFilters);
    },
    [filters, fetchUsers]
  );

  const approveUser = async (userId: string, justification: string) => {
    const supabase = createClient();
    const admin = await getAdminUser();

    const { data: user } = await supabase
      .from('users')
      .select('verification_status, trust_score')
      .eq('id', userId)
      .single();

    await supabase
      .from('users')
      .update({
        verification_status: 'approved',
        status: 'verified',
        verified_at: new Date().toISOString(),
        ...(admin ? { verified_by: admin.id } : {}),
      })
      .eq('id', userId);

    await supabase.from('user_verification_history').insert({
      user_id: userId,
      old_status: user?.verification_status ?? 'pending',
      new_status: 'approved',
      reason: justification,
      ...(admin ? { changed_by: admin.id } : {}),
    });

    if (admin) {
      await logAudit(supabase, {
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'user_reactivated',
        targetType: 'user',
        targetId: userId,
      });
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, verification_status: 'approved', status: 'verified' }
          : u
      )
    );
  };

  const rejectUser = async (userId: string, reason: string) => {
    const supabase = createClient();
    const admin = await getAdminUser();

    const { data: user } = await supabase
      .from('users')
      .select('verification_status')
      .eq('id', userId)
      .single();

    await supabase
      .from('users')
      .update({
        verification_status: 'rejected',
        status: 'suspended',
        rejection_reason: reason,
      })
      .eq('id', userId);

    await supabase.from('user_verification_history').insert({
      user_id: userId,
      old_status: user?.verification_status ?? 'pending',
      new_status: 'rejected',
      reason,
      ...(admin ? { changed_by: admin.id } : {}),
    });

    if (admin) {
      await logAudit(supabase, {
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'user_suspended',
        targetType: 'user',
        targetId: userId,
      });
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, verification_status: 'rejected', status: 'suspended', rejection_reason: reason }
          : u
      )
    );
  };

  const requestDocuments = async (userId: string) => {
    const supabase = createClient();
    await supabase
      .from('users')
      .update({ kyc_status: 'submitted' })
      .eq('id', userId);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, kyc_status: 'submitted' } : u))
    );
  };

  const blockUser = async (user: UserRow) => {
    const supabase = createClient();
    const admin = await getAdminUser();

    await supabase.from('users').update({ status: 'blocked' }).eq('id', user.id);

    if (admin) {
      await logAudit(supabase, {
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'user_blocked',
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
      });
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: 'blocked' } : u))
    );
  };

  const suspendUser = async (user: UserRow) => {
    const newStatus = user.status === 'active' || user.status === 'verified' ? 'suspended' : 'active';
    const supabase = createClient();
    const admin = await getAdminUser();

    await supabase.from('users').update({ status: newStatus }).eq('id', user.id);

    if (admin) {
      await logAudit(supabase, {
        actorId: admin.id,
        actorEmail: admin.email,
        action: newStatus === 'active' ? 'user_reactivated' : 'user_suspended',
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
      });
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
    );
  };

  const toggleRole = async (user: UserRow) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const supabase = createClient();
    await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
  };

  const deleteUser = async (opts: {
    user: UserRow;
    deleteType: 'soft' | 'hard';
    reason: string;
    notify: boolean;
  }) => {
    const { user, deleteType, reason, notify } = opts;
    const supabase = createClient();
    const admin = await getAdminUser();

    if (deleteType === 'soft') {
      const deletionScheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('users')
        .update({
          status: 'pending_deletion',
          deleted_at: new Date().toISOString(),
          deletion_scheduled_at: deletionScheduledAt,
        })
        .eq('id', user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: 'pending_deletion' } : u)));
    } else {
      await supabase.from('favorites').delete().eq('user_id', user.id);
      await supabase.from('reviews').delete().eq('reviewer_id', user.id);
      await supabase.from('products').update({ status: 'removed' }).eq('user_id', user.id);
      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);

      if (user.auth_id) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userId: user.id, authId: user.auth_id, reason }),
        });
      } else {
        await supabase.from('users').delete().eq('id', user.id);
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    }

    if (admin) {
      await logAudit(supabase, {
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'user_deleted',
        targetType: 'user',
        targetId: user.id,
        targetEmail: user.email,
        details: { delete_type: deleteType, reason, notify },
      });
    }
  };

  const bulkApprove = async (ids: string[], justification: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_approve', userIds: ids, reason: justification }),
    });
    if (!res.ok) throw new Error('Falha na aprovação em lote');
    setUsers((prev) =>
      prev.map((u) =>
        ids.includes(u.id)
          ? { ...u, verification_status: 'approved' as const, status: 'verified' }
          : u
      )
    );
    setSelectedIds([]);
  };

  const bulkReject = async (ids: string[], reason: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_reject', userIds: ids, reason }),
    });
    if (!res.ok) throw new Error('Falha na reprovação em lote');
    setUsers((prev) =>
      prev.map((u) =>
        ids.includes(u.id)
          ? { ...u, verification_status: 'rejected' as const, status: 'suspended' }
          : u
      )
    );
    setSelectedIds([]);
  };

  const recalculateTrustScore = async (userId: string) => {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (!user) return;

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_id', userId)
      .eq('delivery_status', 'confirmed');

    const result = calculateTrustScore({
      email_verified: !!user.email,
      phone_verified: !!user.phone,
      kyc_status: user.kyc_status,
      selfie_url: user.selfie_url,
      city: user.city,
      state: user.state,
      created_at: user.created_at,
      completed_transactions: ordersData?.length ?? 0,
    });

    await supabase
      .from('users')
      .update({ trust_score: result.score })
      .eq('id', userId);

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, trust_score: result.score } : u))
    );
  };

  const detectDuplicatesForUser = async (userId: string) => {
    const supabase = createClient();
    return detectDuplicates(supabase, userId);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Nome', 'Email', 'Tipo', 'Status', 'Verificação', 'Trust Score', 'Cidade', 'Cadastro'];
    const rows = users.map((u) => [
      u.id,
      u.name,
      u.email,
      u.type,
      u.status ?? '',
      u.verification_status ?? '',
      String(u.trust_score ?? 0),
      u.city ?? '',
      u.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  return {
    users,
    loading,
    filters,
    selectedIds,
    stats,
    pagination,
    applyFilters,
    fetchUsers,
    approveUser,
    rejectUser,
    requestDocuments,
    blockUser,
    suspendUser,
    toggleRole,
    deleteUser,
    bulkApprove,
    bulkReject,
    recalculateTrustScore,
    detectDuplicatesForUser,
    exportCSV,
    toggleSelect,
    toggleSelectAll,
    setPage: (page: number) => setPagination((prev) => ({ ...prev, page })),
  };
}
