'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, Zap, Users, Video } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const BENEFITS = [
  { icon: Video, text: 'Vídeo automático grátis' },
  { icon: Users, text: 'Milhares de compradores' },
  { icon: Zap, text: 'Venda em minutos' },
];

export default function HeroCTA() {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem('cov_hero_cta_dismissed');
    if (isDismissed) setDismissed(true);
  }, []);

  if (!mounted || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('cov_hero_cta_dismissed', '1');
  };

  const handleCTA = () => {
    if (user) {
      router.push('/product/new');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="relative mx-4 mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-purple via-[#7B2FBE] to-brand-orange shadow-xl shadow-brand-purple/20 animate-fade-in">
      {/* Background decoration */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-10 -translate-x-10" />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Fechar banner"
        className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative z-10 p-5 pr-10">
        <h2 className="font-display font-bold text-white text-lg leading-snug">
          Transforme seus produtos<br />em vendas hoje
        </h2>
        <p className="text-white/75 text-sm mt-1 mb-4 leading-relaxed">
          Crie seu anúncio em segundos e alcance compradores perto de você.
        </p>

        {/* Benefits */}
        <div className="flex flex-wrap gap-2 mb-4">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-xs text-white font-medium">
              <Icon className="w-3 h-3" />
              {text}
            </span>
          ))}
        </div>

        <button
          onClick={handleCTA}
          className="flex items-center gap-2 bg-white text-brand-purple font-bold text-sm px-5 py-2.5 rounded-2xl hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-md"
          aria-label="Anunciar em segundos"
        >
          <Camera className="w-4 h-4" />
          Anunciar em Segundos
        </button>
      </div>
    </div>
  );
}
