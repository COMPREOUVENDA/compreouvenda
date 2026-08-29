'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Ticket, Megaphone, QrCode, Store, BarChart3,
  Menu, X, LogOut, Loader2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { adminFetchJson } from '@/lib/admin-fetch';

// Mesma linguagem visual do painel administrativo — o parceiro reconhece o
// produto, mas o escopo é sempre a própria empresa.
const MENU_ITEMS = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard, href: '/parceiro' },
  { id: 'benefits', label: 'Benefícios', icon: Ticket, href: '/parceiro/beneficios' },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone, href: '/parceiro/campanhas' },
  { id: 'validate', label: 'Validar benefício', icon: QrCode, href: '/parceiro/validar' },
  { id: 'units', label: 'Unidades', icon: Store, href: '/parceiro/unidades' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, href: '/parceiro/relatorios' },
];

interface Me {
  partner: { trade_name: string; status: string; plan: string };
  role: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Cadastro em análise',
  approved: 'Empresa ativa',
  rejected: 'Cadastro rejeitado',
  suspended: 'Empresa suspensa',
  inactive: 'Empresa inativa',
  changes_requested: 'Correções solicitadas',
};

export default function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [denyMessage, setDenyMessage] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const d = await adminFetchJson<Me>('/api/partner/dashboard');
      setMe(d);
      setState('ok');
    } catch (e) {
      setDenyMessage(e instanceof Error ? e.message : 'Acesso negado');
      setState('denied');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeId = MENU_ITEMS.find((m) =>
    m.href === '/parceiro' ? pathname === '/parceiro' : pathname.startsWith(m.href)
  )?.id || 'dashboard';

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.replace('/login');
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="font-display font-bold text-white text-lg mb-2">Portal do Parceiro</h1>
          <p className="text-sm text-gray-400 mb-6">{denyMessage}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="bg-brand-purple text-white text-sm px-4 py-2 rounded-xl">
              Entrar com outra conta
            </Link>
            <Link href="/" className="bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-xl">
              Voltar ao site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const status = me?.partner.status ?? 'pending';

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <Image src="/logo-full.png" alt="compreOUvenda.com" width={200} height={55}
            className="h-10 w-auto object-contain brightness-0 invert" priority />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-700">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Portal do Parceiro</p>
          <p className="text-sm text-white font-medium truncate mt-0.5">{me?.partner.trade_name}</p>
          <span className={cn(
            'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5',
            status === 'approved' ? 'bg-emerald-500/15 text-emerald-400'
              : status === 'pending' || status === 'changes_requested' ? 'bg-amber-500/15 text-amber-400'
                : 'bg-red-500/15 text-red-400'
          )}>
            {STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <nav className="p-3 space-y-0.5 overflow-y-auto">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeId === item.id
                  ? 'bg-brand-purple text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-white text-lg">
              {MENU_ITEMS.find((m) => m.id === activeId)?.label}
            </h1>
          </div>
          <span className="text-xs text-gray-500 capitalize hidden sm:block">
            {me?.role === 'owner' ? 'Responsável' : me?.role === 'manager' ? 'Gestor' : 'Operador'}
          </span>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
