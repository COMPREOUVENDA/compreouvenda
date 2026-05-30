'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Loader2, WifiOff } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Header() {
  const { locationLabel, loading, granted, requestLocation } = useGeolocation();
  const { isOffline } = useOnlineStatus();

  // Auto-request location on first visit
  useEffect(() => {
    if (!granted && typeof window !== 'undefined') {
      // Only auto-request if permission was previously granted
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') requestLocation();
      });
    }
  }, [granted, requestLocation]);

  return (
    <header role="banner" className="sticky top-0 z-40 glass border-b border-gray-200/50">
      {/* ── Badge Modo Offline ─────────────────────────────────────────────── */}
      {isOffline && (
        <div className="w-full bg-amber-500 text-white text-xs font-semibold py-1 px-4 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Modo Offline — exibindo dados do cache</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link href="/" aria-label="COMPREOUVENDA.COM - Página inicial" className="flex items-center">
          <Image
            src="/logo-full.png"
            alt="compreOUvenda.com"
            width={220}
            height={60}
            className="h-14 w-auto object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={requestLocation}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-purple transition-colors bg-gray-100/80 px-3 py-1.5 rounded-full"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            <span className="font-medium truncate max-w-[140px]">
              {granted ? locationLabel : 'Sua localização'}
            </span>
          </button>
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
