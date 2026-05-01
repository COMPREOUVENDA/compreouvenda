'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, Video, CreditCard, GitBranch, Users2,
  HandHeart, Heart, MapPin, Gavel, Zap, Flag, LifeBuoy, Bell, FileText,
  Settings, Shield, ScrollText, Menu, X, LogOut, ChevronDown, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'commercial', label: 'Comercial', icon: TrendingUp },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'videos', label: 'Vídeos & IA', icon: Video },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'splits', label: 'Split', icon: GitBranch },
  { id: 'commissions', label: 'Comissões', icon: Users2 },
  { id: 'donations', label: 'Doações', icon: HandHeart },
  { id: 'charities', label: 'Instituições', icon: Heart },
  { id: 'geo', label: 'Geolocalização', icon: MapPin },
  { id: 'auctions', label: 'Leilões', icon: Gavel },
  { id: 'flash', label: 'Ofertas Flash', icon: Zap },
  { id: 'reports', label: 'Denúncias', icon: Flag },
  { id: 'support', label: 'Suporte', icon: LifeBuoy },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'content', label: 'Conteúdo', icon: FileText },
  { id: 'settings', label: 'Configurações', icon: Settings },
  { id: 'admins', label: 'Administradores', icon: Shield },
  { id: 'audit', label: 'Logs de Auditoria', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-700">
          <Image src="/logo-full.png" alt="compreOUvenda.com" width={200} height={55} className="h-12 w-auto object-contain brightness-0 invert" priority />
        </div>

        {/* Menu */}
        <nav className="p-3 space-y-0.5 overflow-y-auto h-[calc(100vh-140px)] scrollbar-hide">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeSection === item.id
                  ? 'bg-brand-purple text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-bold text-white text-lg capitalize">
              {MENU_ITEMS.find((m) => m.id === activeSection)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
            </button>
            <div className="flex items-center gap-2 bg-gray-700/50 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center text-white text-xs font-bold">A</div>
              <span className="text-sm text-white font-medium hidden sm:block">Admin</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </div>
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
