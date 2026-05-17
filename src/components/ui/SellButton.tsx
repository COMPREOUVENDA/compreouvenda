'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function SellButton() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [bounced, setBounced] = useState(false);

  // Bounce once on first visit
  useEffect(() => {
    const visited = typeof window !== 'undefined' && localStorage.getItem('cov_sell_btn_seen');
    if (!visited) {
      setTimeout(() => {
        setBounced(true);
        setTimeout(() => setBounced(false), 1200);
      }, 1800);
      localStorage.setItem('cov_sell_btn_seen', '1');
    }
  }, []);

  // Hide on /product/new
  if (pathname?.includes('/product/new')) return null;

  const handleClick = () => {
    if (user) {
      router.push('/product/new');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-8 md:right-6 group">
      {/* Tooltip */}
      <span
        aria-hidden="true"
        className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-lg"
      >
        Anunciar Agora
      </span>

      {/* Glow ring */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-purple to-brand-orange opacity-30 animate-ping"
        style={{ animationDuration: '2.5s' }}
      />

      <button
        onClick={handleClick}
        aria-label="Anunciar Agora"
        className={`
          relative flex items-center justify-center
          w-14 h-14 md:w-16 md:h-16
          rounded-full
          bg-gradient-to-br from-brand-purple to-brand-orange
          shadow-lg shadow-brand-purple/40
          text-white
          transition-all duration-300
          hover:scale-110 hover:shadow-xl hover:shadow-brand-orange/40
          active:scale-95
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple
          ${bounced ? 'animate-bounce' : ''}
        `}
      >
        <Plus className="w-7 h-7 md:w-8 md:h-8" strokeWidth={2.5} />
      </button>
    </div>
  );
}
