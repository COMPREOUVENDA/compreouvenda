'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, MessageCircle } from 'lucide-react';
import { useNotifications, type NewMessageAlert } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-pink
                    flex items-center justify-center text-white font-bold text-base shrink-0 ring-2 ring-white">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Toast({ alert, onDismiss }: { alert: NewMessageAlert; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`flex items-start gap-3 w-full transition-all duration-300 ease-out
                  ${visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}
    >
      <Avatar name={alert.senderName} src={alert.senderAvatar} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white leading-tight truncate">
            {alert.senderName}
          </p>
          <span className="text-[11px] text-white/60 shrink-0">
            {formatDistanceToNow(new Date(alert.at), { addSuffix: false, locale: ptBR })}
          </span>
        </div>
        <p className="text-xs text-white/80 mt-0.5 line-clamp-2 leading-snug">
          {alert.preview}
        </p>
        <Link
          href={`/chat?id=${alert.conversationId}`}
          onClick={handleDismiss}
          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold
                     bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full
                     transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          Responder
        </Link>
      </div>

      <button
        onClick={handleDismiss}
        aria-label="Fechar"
        className="shrink-0 p-1 rounded-full text-white/60 hover:text-white
                   hover:bg-white/10 transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function NewMessageToast() {
  const { messageAlert, dismissMessageAlert } = useNotifications();

  if (!messageAlert) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] w-80 max-w-[calc(100vw-2rem)]
                 bg-gradient-to-br from-brand-purple to-brand-blue
                 rounded-2xl shadow-2xl shadow-black/30 p-4
                 pointer-events-auto"
      role="alert"
      aria-live="polite"
    >
      <Toast key={messageAlert.id} alert={messageAlert} onDismiss={dismissMessageAlert} />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 rounded-b-2xl overflow-hidden">
        <div className="h-full bg-white/60 animate-shrink-x" />
      </div>

      <style jsx>{`
        @keyframes shrink-x {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .animate-shrink-x {
          animation: shrink-x 6s linear forwards;
        }
      `}</style>
    </div>
  );
}
