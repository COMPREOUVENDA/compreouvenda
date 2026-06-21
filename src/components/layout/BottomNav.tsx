'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useChat } from '@/hooks/useChat';

const BASE_NAV = [
  { href: '/', icon: Home, label: 'Início' },
  { href: '/search', icon: Search, label: 'Buscar' },
  { href: '/product/new', icon: PlusCircle, label: 'Vender', isSell: true },
  { href: '/chat', icon: MessageCircle, label: 'Chat', isChat: true },
  { href: '/profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversations } = useChat();

  const totalUnread = conversations.reduce((sum, c) => {
    if (!user) return sum;
    return sum + (c.buyer_id === user.id ? (c.unread_buyer || 0) : (c.unread_seller || 0));
  }, 0);

  const handleSellClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push('/product/new');
    } else {
      router.push('/login');
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/50 px-2 pb-safe md:hidden"
    >
      <div className="flex items-center justify-around py-2">
        {BASE_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isSell = item.isSell;
          const isChat = (item as any).isChat;

          if (isSell) {
            return (
              <button
                key={item.href}
                onClick={handleSellClick}
                aria-label={item.label}
                className="flex flex-col items-center gap-0.5 py-1 px-3"
              >
                <div className="bg-gradient-to-br from-brand-purple to-brand-orange rounded-full p-3 -mt-6 shadow-lg shadow-brand-purple/40 ring-4 ring-white transition-transform duration-200 active:scale-95 hover:shadow-xl hover:shadow-brand-orange/40">
                  <item.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-brand-purple mt-0.5">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all duration-200',
                isActive ? 'text-brand-purple' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn('w-5 h-5', isActive && 'scale-110')}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {isChat && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-brand-pink rounded-full flex items-center justify-center text-[9px] text-white font-bold px-0.5">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
