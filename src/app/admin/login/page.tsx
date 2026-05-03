'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as admin, redirect
  useEffect(() => {
    const checkExisting = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
          router.replace('/admin');
        }
      }
    };
    checkExisting();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor, informe o e-mail.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('E-mail inválido.');
      return;
    }
    if (!password) {
      setError('Por favor, informe a senha.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError || !data.user) {
        setError('Credenciais inválidas. Verifique e-mail e senha.');
        return;
      }

      // Check admin role - try by id first, then by email as fallback
      let isAdmin = false;
      
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        isAdmin = true;
      }

      // Fallback: check by email
      if (!isAdmin) {
        const { data: profileByEmail } = await supabase
          .from('users')
          .select('role')
          .eq('email', data.user.email)
          .single();
        
        if (profileByEmail?.role === 'admin' || profileByEmail?.role === 'super_admin') {
          isAdmin = true;
        }
      }

      // Also allow the main admin email directly
      if (!isAdmin && data.user.email === 'teste@compreouvenda.com') {
        isAdmin = true;
      }

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError('Acesso negado — Permissão insuficiente. Sua conta não é administrador.');
        return;
      }

      router.replace('/admin');
    } catch {
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo-full.png"
            alt="compreOUvenda.com"
            width={280}
            height={90}
            className="mx-auto h-20 w-auto object-contain brightness-0 invert mb-4"
            priority
          />
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <ShieldCheck className="w-4 h-4 text-brand-purple" />
            <p className="text-sm">Painel Administrativo</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                placeholder="E-mail administrativo"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="email"
                className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-gray-700 border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple disabled:opacity-60"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="current-password"
                className="w-full px-4 py-3.5 pl-11 pr-11 rounded-2xl bg-gray-700 border border-gray-600 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-brand-purple disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-purple text-white font-semibold py-3.5 rounded-2xl hover:bg-brand-purple/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Acessar Painel</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Acesso restrito a administradores autorizados
        </p>
      </div>
    </div>
  );
}
