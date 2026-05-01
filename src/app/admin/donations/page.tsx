'use client';

import { HandHeart, Heart } from 'lucide-react';

const MOCK_DONATIONS = [
  { id: '1', seller: 'Maria Santos', charity: 'AACD', product: 'iPhone 14', amount: 'R$ 80', type: '2%', status: 'transferred', date: '20/04' },
  { id: '2', seller: 'Ana Oliveira', charity: 'Cruz Vermelha', product: 'Bicicleta', amount: 'R$ 50', type: 'Fixo', status: 'confirmed', date: '19/04' },
  { id: '3', seller: 'Carla Lima', charity: 'UNICEF', product: 'Vestido Azul', amount: 'R$ 45', type: '10%', status: 'pending', date: '18/04' },
];

const MOCK_CHARITIES = [
  { id: '1', name: 'AACD', verified: true, total: 'R$ 3.450', donations: 42 },
  { id: '2', name: 'Cruz Vermelha', verified: true, total: 'R$ 2.890', donations: 31 },
  { id: '3', name: 'UNICEF', verified: true, total: 'R$ 2.050', donations: 28 },
];

export default function AdminDonationsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <HandHeart className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
          <span className="font-display font-bold text-xl text-emerald-400">R$ 8.390</span>
          <span className="block text-xs text-gray-500">Total Doado</span>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <span className="font-display font-bold text-xl text-white">101</span>
          <span className="block text-xs text-gray-500">Doações Realizadas</span>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
          <span className="font-display font-bold text-xl text-brand-blue">3</span>
          <span className="block text-xs text-gray-500">Instituições Ativas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white">Doações Recentes</h3></div>
          <div className="divide-y divide-gray-700/50">
            {MOCK_DONATIONS.map((d) => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-700/30">
                <div>
                  <span className="text-sm text-white">{d.seller} → {d.charity}</span>
                  <span className="block text-xs text-gray-500">{d.product} · {d.type} · {d.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-emerald-400 font-semibold">{d.amount}</span>
                  <span className={`block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${d.status === 'transferred' ? 'bg-emerald-500/10 text-emerald-500' : d.status === 'confirmed' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-amber-500/10 text-amber-500'}`}>
                    {d.status === 'transferred' ? 'Transferido' : d.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white">Instituições Beneficentes</h3></div>
          <div className="divide-y divide-gray-700/50">
            {MOCK_CHARITIES.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-sm text-white font-medium">{c.name}</span>
                    <span className="block text-xs text-gray-500">{c.donations} doações</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-emerald-400 font-display font-semibold">{c.total}</span>
                  {c.verified && <span className="block text-[10px] text-brand-blue">✓ Verificada</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
