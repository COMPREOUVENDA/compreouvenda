'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, MapPin, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

export default function Header() {
  const { locationLabel, loading, granted, requestLocation } = useGeolocation();

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
          <Link href="/notifications" aria-label="Ver notificações" className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
}
