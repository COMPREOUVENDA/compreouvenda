'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, ExternalLink, Package, MessageCircle,
         DollarSign, Star, ShoppingBag, Zap, Settings, X } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_ICON: Record<string, React.ElementType> = {
  new_order:        ShoppingBag,
  new_message:      MessageCircle,
  product_sold:     Package,
  payment_received: DollarSign,
  review_received:  Star,
  price_alert:      Zap,
  promotion:        Zap,
  system:           Bell,
  broadcast:        Bell,
};

const TYPE_COLOR: Record<string, string> = {
  new_order:        'text-blue-400 bg-blue-400/10',
  new_message:      'text-green-400 bg-green-400/10',
  product_sold:     'text-purple-400 bg-purple-400/10',
  payment_received: 'text-emerald-400 bg-emerald-400/10',
  review_received:  'text-yellow-400 bg-yellow-400/10',
  price_alert:      'text-orange-400 bg-orange-400/10',
  promotion:        'text-pink-400 bg-pink-400/10',
  system:           'text-gray-400 bg-gray-400/10',
  broadcast:        'text-gray-400 bg-gray-400/10',
};

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const recent = notifications.slice(0, 15);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-brand-pink text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96
                     bg-white border border-gray-200 rounded-2xl shadow-2xl
                     overflow-hidden z-50 animate-fade-in"
          role="dialog"
          aria-label="Central de notificações"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-purple" />
              <span className="font-semibold text-gray-900 text-sm">Notificações</span>
              {unreadCount > 0 && (
                <span className="bg-brand-purple/10 text-brand-purple text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs text-gray-500 hover:text-brand-purple flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ler todas</span>
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-brand-purple p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                title="Ver todas"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[420px]">
            {recent.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <BellOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Nenhuma notificação</p>
                <p className="text-xs mt-1">Você está em dia!</p>
              </div>
            ) : (
              recent.map((notif) => {
                const Icon = TYPE_ICON[notif.type] || Bell;
                const colorClass = TYPE_COLOR[notif.type] || TYPE_COLOR.system;
                const isUnread = !notif.read_at;
                const url = (notif.data as any)?.url || '/notifications';

                return (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer
                                hover:bg-gray-50 transition-colors group
                                ${isUnread ? 'bg-purple-50/40' : ''}`}
                    onClick={() => {
                      if (isUnread) markAsRead(notif.id);
                    }}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug line-clamp-1 ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span className="shrink-0 mt-1.5 w-2 h-2 bg-brand-purple rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-brand-purple hover:text-brand-purple/80 transition-colors"
            >
              Ver todas as notificações →
            </Link>
            <Link
              href="/notifications?tab=settings"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Configurações"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out both;
        }
      `}</style>
    </div>
  );
}
