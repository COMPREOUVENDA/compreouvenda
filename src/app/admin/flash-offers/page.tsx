'use client';

import { Zap, Clock } from 'lucide-react';

export default function AdminFlashOffersPage() {
  const flashOffers: {
    id: string;
    product: string;
    originalPrice: string;
    offerPrice: string;
    discount: string;
    endsIn: string;
    status: 'active' | 'expired';
  }[] = [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ofertas Ativas', value: '89', color: 'text-brand-pink' },
          { label: 'Conversão', value: '34%', color: 'text-emerald-400' },
          { label: 'Valor Economizado', value: 'R$ 12.5K', color: 'text-brand-gold' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
            <span className={`font-display font-bold text-xl ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-brand-pink" /> Ofertas Imperdíveis</h3></div>
        <div className="divide-y divide-gray-700/50">
          {flashOffers.map((f) => (
            <div key={f.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-700/30">
              <div>
                <span className="text-sm text-white font-medium">{f.product}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 line-through">{f.originalPrice}</span>
                  <span className="text-sm text-brand-pink font-display font-bold">{f.offerPrice}</span>
                  <span className="text-[10px] bg-brand-pink/10 text-brand-pink font-bold px-1.5 py-0.5 rounded">{f.discount}</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`flex items-center gap-1 text-xs ${f.status === 'active' ? 'text-brand-gold' : 'text-gray-500'}`}>
                  <Clock className="w-3 h-3" /> {f.endsIn}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${f.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-600/50 text-gray-400'}`}>
                  {f.status === 'active' ? 'Ativa' : 'Expirada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
