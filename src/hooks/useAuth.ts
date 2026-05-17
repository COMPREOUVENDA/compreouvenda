'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { User, LGPDConsents } from '@/types';

const supabase = createClient();

// ─── Consent record structure for user_consents table ────────────────────────

interface ConsentRecord {
  user_id: string;
  subject: 'terms' | 'privacy' | 'geolocation' | 'marketing';
  purpose: string;
  legal_basis: string;
  version: string;
  granted: boolean;
  granted_at: string;
  source: 'registration';
}

const CONSENT_META: Record<
  ConsentRecord['subject'],
  { purpose: string; legal_basis: string }
> = {
  terms: {
    purpose: 'Aceitação dos Termos de Uso da plataforma',
    legal_basis: 'Execução de contrato (Art. 7°, V – LGPD)',
  },
  privacy: {
    purpose: 'Aceitação da Política de Privacidade',
    legal_basis: 'Execução de contrato (Art. 7°, V – LGPD)',
  },
  geolocation: {
    purpose: 'Uso da localização geográfica para conectar compradores e vendedores próximos',
    legal_basis: 'Execução de contrato (Art. 7°, V – LGPD)',
  },
  marketing: {
    purpose: 'Envio de comunicações promocionais por e-mail e push',
    legal_basis: 'Consentimento do titular (Art. 7°, I – LGPD)',
  },
};

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const router = useRouter();

  // Load user profile from public.users table
  const loadProfile = useCallback(async (authId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();

    if (data) {
      setUser(data as User);
    }
  }, [setUser]);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Initial check
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        loadProfile(authUser.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, setUser, setLoading]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    if (data.user) {
      await loadProfile(data.user.id);

      // If account was pending deletion, reactivate it automatically on login
      const { data: profile } = await supabase
        .from('users')
        .select('status, verification_status')
        .eq('auth_id', data.user.id)
        .single();

      if (profile?.status === 'pending_deletion') {
        await supabase
          .from('users')
          .update({ status: 'active', deleted_at: null, deletion_scheduled_at: null })
          .eq('auth_id', data.user.id);
        await loadProfile(data.user.id);
      }

      // Block access only if explicitly blocked or suspended
      if (profile?.status === 'blocked') {
        await supabase.auth.signOut();
        setLoading(false);
        throw new Error('blocked: Sua conta foi bloqueada. Entre em contato com o suporte.');
      }
      if (profile?.status === 'suspended' || profile?.verification_status === 'rejected') {
        await supabase.auth.signOut();
        setLoading(false);
        throw new Error('suspended: Sua conta está suspensa. Entre em contato com o suporte.');
      }
      // verification_status='pending' or 'approved' — allow access normally
    }
    setLoading(false);
    return data;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    type: string,
    extras?: {
      phone?: string;
      document?: string;
      city?: string;
      state?: string;
      lat?: number;
      lng?: number;
      consents?: LGPDConsents;
    }
  ) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          type,
          phone: extras?.phone ?? '',
          document: extras?.document ?? '',
          city: extras?.city ?? '',
          state: extras?.state ?? '',
        },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    // Profile is auto-created by the trigger handle_new_user()
    // Also update extra fields in case the trigger doesn't copy them
    if (data.user && extras) {
      const updatePayload: Record<string, string | number> = {};
      if (extras.phone) updatePayload.phone = extras.phone;
      if (extras.document) updatePayload.document = extras.document;
      if (extras.city) updatePayload.city = extras.city;
      if (extras.state) updatePayload.state = extras.state;
      if (extras.lat != null) updatePayload.location_lat = extras.lat;
      if (extras.lng != null) updatePayload.location_lng = extras.lng;

      if (Object.keys(updatePayload).length > 0) {
        await supabase
          .from('users')
          .update(updatePayload)
          .eq('auth_id', data.user.id);
      }

      // ── Insert LGPD consent records ──────────────────────────────────────
      if (extras.consents) {
        const lgpd = extras.consents;
        const now = lgpd.timestamp || new Date().toISOString();
        const version = lgpd.version ?? '1.0';

        const consentSubjects: ConsentRecord['subject'][] = [
          'terms',
          'privacy',
          'geolocation',
          'marketing',
        ];

        const grantedMap: Record<ConsentRecord['subject'], boolean> = {
          terms: lgpd.terms_accepted,
          privacy: lgpd.privacy_accepted,
          geolocation: lgpd.geolocation_accepted,
          marketing: lgpd.marketing_accepted,
        };

        const records: ConsentRecord[] = consentSubjects.map((subject) => ({
          user_id: data.user!.id,
          subject,
          purpose: CONSENT_META[subject].purpose,
          legal_basis: CONSENT_META[subject].legal_basis,
          version,
          granted: grantedMap[subject],
          granted_at: now,
          source: 'registration',
        }));

        // Use upsert so re-registration attempts don't fail on duplicates
        const { error: consentError } = await supabase
          .from('user_consents')
          .upsert(records, {
            onConflict: 'user_id,subject',
            ignoreDuplicates: false,
          });

        // Non-blocking: log but don't throw — user account is already created
        if (consentError) {
          console.warn('[useAuth] Failed to save consent records:', consentError.message);
        }
      }
    }

    if (data.user) {
      await loadProfile(data.user.id);
    }
    setLoading(false);
    return data;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return { user, isLoading, signIn, signUp, signOut, signInWithGoogle, supabase };
}
