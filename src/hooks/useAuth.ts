'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

const supabase = createClient();

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
    }
    setLoading(false);
    return data;
  };

  const signUp = async (email: string, password: string, name: string, type: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, type },
      },
    });

    if (error) {
      setLoading(false);
      throw error;
    }

    // Profile is auto-created by the trigger handle_new_user()
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
