'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldX } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'denied'>('loading');
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Login page doesn't need auth check
    if (isLoginPage) {
      setStatus('authorized');
      return;
    }

    const check = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/admin/login');
          return;
        }

        // Fonte única de verdade: admin_users, resolvida no servidor.
        // O token vai no header porque o cookie pode não estar disponível
        // logo após o login no cliente.
        const res = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const data = await res.json();

        setStatus(data?.isAdmin ? 'authorized' : 'denied');
      } catch {
        router.replace('/admin/login');
      }
    };

    check();
  }, [isLoginPage, router]);

  // Login page: render without protection overlay
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-purple animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white">Acesso Negado</h2>
          <p className="text-gray-400 text-sm">
            Permissão insuficiente. Sua conta não tem privilégios de administrador.
          </p>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.replace('/admin/login');
            }}
            className="w-full bg-gray-700 text-white font-semibold py-3 rounded-xl hover:bg-gray-600 transition-colors text-sm"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
