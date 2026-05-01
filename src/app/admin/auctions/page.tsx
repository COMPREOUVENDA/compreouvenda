'use client';

import { Gavel, Clock, Trophy } from 'lucide-react';

const MOCK_AUCTIONS = [
  { id: '1', product: 'PS5 + 2 Controles', seller: 'Pedro Costa', startPrice: 'R$ 2.500', currentBid: 'R$ 3.100', bids: 12, endsAt: '22/04 18:00', status: 'open' },
  { id: '2', product: 'Câmera Canon EOS', seller: 'Maria Santos', startPrice: 'R$ 1.800', currentBid: 'R$ 2.400', bids: 8, endsAt: '21/04 20:00', status: 'open' },
  { id: '3', product: 'Relógio Rolex', seller: 'Lucas Ferreira', startPrice: 'R$ 5.000', currentBid: 'R$ 7.200', bids: 23, endsAt: '20/04 15:00', status: 'closed' },
];

export default function AdminAuctionsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Leilões Ativos', value: '127', icon: Gavel, color: 'text-brand-gold' },
          { label: 'Total Lances', value: '1.456', icon: Trophy, color: 'text-brand-blue' },
          { label: 'Valor Movimentado', value: 'R$ 89.3K', icon: Clock, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
            <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-1`} />
            <span className={`font-display font-bold text-xl ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white">Leilões</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-700">
            <th className="text-left text-xs text-gray-500 px-5 py-3">Produto</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">Vendedor</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Início</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Lance Atual</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">Lances</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-700/50">
            {MOCK_AUCTIONS.map((a) => (
              <tr key={a.id} className="hover:bg-gray-700/30">
                <td className="px-5 py-3 text-sm text-white">{a.product}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{a.seller}</td>
                <td className="px-5 py-3 text-sm text-gray-400">{a.startPrice}</td>
                <td className="px-5 py-3 text-sm text-brand-gold font-display font-semibold">{a.currentBid}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{a.bids}</td>
                <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-600/50 text-gray-400'}`}>{a.status === 'open' ? 'Aberto' : 'Encerrado'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
