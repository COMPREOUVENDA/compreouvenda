'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, BellRing, CheckCheck, Package, CreditCard, MessageCircle, Heart, Star, Video, Megaphone, Gift, ShieldAlert } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const ICON_MAP: Record<string, any> = {
  payment: CreditCard,
  order: Package,
  message: MessageCircle,
  favorite: Heart,
  review: Star,
  video: Video,
  promotion: Megaphone,
  donation: Gift,
  security: ShieldAlert,
  default: Bell,
};

const COLOR_MAP: Record<string, string> = {
  payment: 'bg-emerald-500/10 text-emerald-500',
  order: 'bg-brand-blue/10 text-brand-blue',
  message: 'bg-brand-purple/10 text-brand-purple',
  favorite: 'bg-brand-pink/10 text-brand-pink',
  review: 'bg-brand-gold/10 text-brand-gold',
  video: 'bg-brand-orange/10 text-brand-orange',
  promotion: 'bg-brand-purple/10 text-brand-purple',
  donation: 'bg-emerald-500/10 text-emerald-500',
  security: 'bg-red-500/10 text-red-500',
  default: 'bg-gray-100 text-gray-500',
};

// Mock notifications for when DB is empty
const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'payment', title: 'Pagamento recebido!', body: 'Você recebeu R$ 4.500 pela venda do iPhone 14 Pro', created_at: new Date(Date.now() - 300000).toISOString(), read_at: null },
  { id: '2', type: 'message', title: 'Nova mensagem', body: 'Maria Santos enviou uma mensagem sobre Sofá Retrátil', created_at: new Date(Date.now() - 3600000).toISOString(), read_at: null },
  { id: '3', type: 'video', title: 'Vídeo pronto! 🎬', body: 'O vídeo do seu produto "Bicicleta Speed" ficou pronto', created_at: new Date(Date.now() - 7200000).toISOString(), read_at: new Date().toISOString() },
  { id: '4', type: 'order', title: 'Novo pedido', body: 'João Silva comprou seu produto "MacBook Air M2"', created_at: new Date(Date.now() - 14400000).toISOString(), read_at: new Date().toISOString() },
  { id: '5', type: 'favorite', title: 'Produto favoritado ❤️', body: '3 pessoas adicionaram seu produto aos favoritos', created_at: new Date(Date.now() - 28800000).toISOString(), read_at: new Date().toISOString() },
  { id: '6', type: 'promotion', title: 'Campanha ativa', body: 'Seu anúncio patrocinado já recebeu 234 impressões', created_at: new Date(Date.now() - 43200000).toISOString(), read_at: new Date().toISOString() },
  { id: '7', type: 'donation', title: 'Doação realizada 💚', body: 'R$ 90 foram doados à AACD pela sua venda', created_at: new Date(Date.now() - 86400000).toISOString(), read_at: new Date().toISOString() },
];

export default function NotificationsPage() {
  const { notifications, unreadCount, pushEnabled, enablePush, markAsRead, markAllRead, loadNotifications } = useNotifications();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const displayNotifs = notifications;

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return Math.floor(diff / 86400000) + 'd';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-display font-bold text-xl text-gray-900">Notificações</h1>
          {unreadCount > 0 && (
            <span className="bg-brand-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!pushEnabled && (
            <button onClick={enablePush} className="text-xs text-brand-purple bg-brand-purple/10 px-3 py-1.5 rounded-lg font-medium hover:bg-brand-purple/20">
              <BellRing className="w-3.5 h-3.5 inline mr-1" />Ativar Push
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-gray-500 hover:text-brand-purple flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> Marcar tudo
            </button>
          )}
        </div>
      </div>

      {/* Push notification banner */}
      {!pushEnabled && (
        <div className="mb-4 bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
            <BellRing className="w-5 h-5 text-brand-purple" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Ative notificações push</p>
            <p className="text-xs text-gray-500">Receba alertas de vendas, mensagens e ofertas em tempo real</p>
          </div>
          <button onClick={enablePush} className="btn-primary text-xs px-4 py-2">Ativar</button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {displayNotifs.map((notif) => {
          const Icon = ICON_MAP[notif.type] || ICON_MAP.default;
          const colorClass = COLOR_MAP[notif.type] || COLOR_MAP.default;
          const isUnread = !notif.read_at;

          return (
            <button
              key={notif.id}
              onClick={() => isUnread && markAsRead(notif.id)}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all text-left ${
                isUnread ? 'bg-brand-purple/5 border border-brand-purple/10' : 'bg-white border border-gray-100 hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</span>
                  {isUnread && <div className="w-2 h-2 bg-brand-pink rounded-full flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{formatTime(notif.created_at)}</span>
            </button>
          );
        })}
      </div>

      {displayNotifs.length === 0 && (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Nenhuma notificação ainda</p>
        </div>
      )}
    </div>
  );
}
