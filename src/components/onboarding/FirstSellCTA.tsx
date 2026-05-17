'use client';

import { useRouter } from 'next/navigation';
import { PlusCircle, Video, Users, Zap } from 'lucide-react';

const BENEFITS = [
  { icon: Video, label: 'Vídeo automático grátis', color: 'text-brand-blue' },
  { icon: Users, label: 'Milhares de compradores', color: 'text-brand-purple' },
  { icon: Zap, label: 'Venda em minutos', color: 'text-brand-orange' },
];

export default function FirstSellCTA() {
  const router = useRouter();

  return (
    <div className="mx-4 mb-6 rounded-3xl border-2 border-brand-purple/20 bg-gradient-to-br from-brand-purple/5 to-brand-orange/5 overflow-hidden shadow-lg animate-fade-in">
      <div className="p-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-orange flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-purple/30">
          <PlusCircle className="w-8 h-8 text-white" strokeWidth={2} />
        </div>

        <h3 className="font-display font-bold text-xl text-gray-900 text-center leading-snug mb-2">
          Crie seu primeiro anúncio!
        </h3>
        <p className="text-gray-500 text-sm text-center mb-5 leading-relaxed">
          Comece a vender agora. Publique seu produto em menos de 2 minutos e alcance compradores perto de você.
        </p>

        {/* Benefits */}
        <div className="space-y-2.5 mb-6">
          {BENEFITS.map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-sm text-gray-700 font-medium">{label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/product/new')}
          aria-label="Criar primeiro anúncio"
          className="w-full btn-gradient py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5" />
          Criar Meu Primeiro Anúncio
        </button>
      </div>
    </div>
  );
}
