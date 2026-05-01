'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Início' },
  { href: '/search', icon: Search, label: 'Buscar' },
  { href: '/product/new', icon: PlusCircle, label: 'Vender' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/dashboard', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/50 px-2 pb-safe md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isSell = item.href === '/product/new';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200',
                isActive && !isSell && 'text-brand-purple',
                !isActive && !isSell && 'text-gray-400 hover:text-gray-600'
              )}
            >
              {isSell ? (
                <div className="bg-gradient-brand rounded-full p-3 -mt-5 shadow-lg shadow-brand-orange/30">
                  <item.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
              ) : (
                <item.icon
                  className={cn('w-5 h-5', isActive && 'scale-110')}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
              )}
              <span className={cn(
                'text-[10px] font-medium',
                isSell && 'mt-0.5'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
