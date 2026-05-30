'use client';

import { useEffect, useState } from 'react';
import { Bell, X, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthStore } from '@/stores/authStore';

const STORAGE_KEY = 'push_banner';

export default function PushPermissionBanner() {
  const { user } = useAuthStore();
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || !isSupported || permission === 'granted' || permission === 'denied' || isSubscribed) return;

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored.dismissed) return;

    const count = (stored.count || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, count }));

    if (count >= 2) {
      // Small delay for smooth entrance
      setTimeout(() => setVisible(true), 800);
    }
  }, [user, isSupported, permission, isSubscribed]);

  const handleAllow = async () => {
    const ok = await subscribe();
    if (ok || Notification.permission !== 'default') {
      dismiss();
    }
  };

  const dismiss = () => {
    setVisible(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, dismissed: true }));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md
                 animate-slide-down"
      role="alertdialog"
      aria-label="Ativar notificações"
    >
      <div className="relative overflow-hidden rounded-2xl
                      bg-gradient-to-r from-purple-600 via-purple-700 to-blue-700
                      shadow-2xl shadow-purple-900/40 border border-purple-500/30 p-4">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">
              Ative notificações para saber quando vender!
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              Receba alertas de pedidos, mensagens e pagamentos em tempo real.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAllow}
                disabled={isLoading}
                className="flex-1 bg-white text-purple-700 font-semibold text-sm py-2 px-4
                           rounded-xl hover:bg-white/90 active:scale-[0.97] transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Aguarde...' : 'Ativar'}
              </button>
              <button
                onClick={dismiss}
                className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white
                           rounded-xl hover:bg-white/10 transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
      `}</style>
    </div>
  );
}
