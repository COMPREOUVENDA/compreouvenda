'use client';

import { Gavel, Clock, Trophy } from 'lucide-react';

export default function AdminAuctionsPage() {
  const auctions: {
    id: string;
    product: string;
    seller: string;
    startPrice: string;
    currentBid: string;
    bids: number;
    endsAt: string;
    status: 'open' | 'closed';
  }[] = [];

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
            {auctions.map((a) => (
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
