'use client';

import { Users2 } from 'lucide-react';

export default function AdminCommissionsPage() {
  const commissions: {
    id: string;
    reseller: string;
    owner: string;
    product: string;
    commission: string;
    type: string;
    status: 'paid' | 'pending' | 'approved';
    date: string;
  }[] = [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Comissões', value: 'R$ 6.270', color: 'text-brand-blue' },
          { label: 'Pendentes', value: 'R$ 1.450', color: 'text-amber-400' },
          { label: 'Pagas', value: 'R$ 4.820', color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
            <span className={`font-display font-bold text-xl ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white">Comissões</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-700">
            <th className="text-left text-xs text-gray-500 px-5 py-3">Revendedor</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">Proprietário</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Produto</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Comissão</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-700/50">
            {commissions.map((c) => (
              <tr key={c.id} className="hover:bg-gray-700/30">
                <td className="px-5 py-3 text-sm text-white">{c.reseller}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{c.owner}</td>
                <td className="px-5 py-3 text-sm text-gray-400">{c.product}</td>
                <td className="px-5 py-3 text-sm text-white font-semibold">{c.commission} <span className="text-gray-500 text-xs">({c.type})</span></td>
                <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : c.status === 'approved' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-amber-500/10 text-amber-500'}`}>{c.status === 'paid' ? 'Pago' : c.status === 'approved' ? 'Aprovado' : 'Pendente'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
