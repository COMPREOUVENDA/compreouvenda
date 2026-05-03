'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Users, Package, Video, CreditCard, GitBranch, Users2,
  HandHeart, Heart, MapPin, Gavel, Zap, Flag, LifeBuoy, Bell, FileText,
  Settings, Shield, ScrollText, Menu, X, LogOut, ChevronDown, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import AdminGuard from './AdminGuard';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { id: 'commercial', label: 'Comercial', icon: TrendingUp, href: '/admin/commercial' },
  { id: 'users', label: 'Usuários', icon: Users, href: '/admin/users' },
  { id: 'products', label: 'Produtos', icon: Package, href: '/admin/products' },
  { id: 'orders', label: 'Pedidos', icon: CreditCard, href: '/admin/orders' },
  { id: 'categories', label: 'Categorias', icon: FileText, href: '/admin/categories' },
  { id: 'videos', label: 'Vídeos & IA', icon: Video, href: '/admin/videos' },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard, href: '/admin/payments' },
  { id: 'splits', label: 'Split', icon: GitBranch, href: '/admin/splits' },
  { id: 'commissions', label: 'Comissões', icon: Users2, href: '/admin/commissions' },
  { id: 'donations', label: 'Doações', icon: HandHeart, href: '/admin/donations' },
  { id: 'charities', label: 'Instituições', icon: Heart, href: '/admin/charities' },
  { id: 'geo', label: 'Geolocalização', icon: MapPin, href: '/admin/geo' },
  { id: 'auctions', label: 'Leilões', icon: Gavel, href: '/admin/auctions' },
  { id: 'flash', label: 'Ofertas Flash', icon: Zap, href: '/admin/flash-offers' },
  { id: 'reports', label: 'Denúncias', icon: Flag, href: '/admin/reports' },
  { id: 'support', label: 'Suporte', icon: LifeBuoy, href: '/admin/support' },
  { id: 'notifications', label: 'Notificações', icon: Bell, href: '/admin/notifications' },
  { id: 'settings', label: 'Configurações', icon: Settings, href: '/admin/settings' },
  { id: 'admins', label: 'Administradores', icon: Shield, href: '/admin/admins' },
  { id: 'audit', label: 'Logs de Auditoria', icon: ScrollText, href: '/admin/audit-logs' },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const activeId = MENU_ITEMS.find((m) => {
    if (m.href === '/admin') return pathname === '/admin';
    return pathname.startsWith(m.href);
  })?.id || 'dashboard';

  const activeLabel = MENU_ITEMS.find((m) => m.id === activeId)?.label || 'Dashboard';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <Image src="/logo-full.png" alt="compreOUvenda.com" width={200} height={55} className="h-12 w-auto object-contain brightness-0 invert" priority />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-140px)] scrollbar-hide">
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

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-white text-lg">
              {activeLabel}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              className="flex items-center gap-2 bg-gray-700/50 hover:bg-red-500/10 rounded-xl px-3 py-1.5 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-white text-xs font-bold">A</div>
              <span className="text-sm text-white font-medium hidden sm:block">Admin</span>
              <LogOut className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Login page gets no sidebar – just the bare children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }
  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Login page: no guard, no shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminGuard>
  );
}
