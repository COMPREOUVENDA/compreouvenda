'use client';

import { CreditCard, ArrowUpRight, ArrowDownRight, Eye } from 'lucide-react';

const MOCK_PAYMENTS = [
  { id: '1', order: '#4521', buyer: 'Ana Oliveira', seller: 'Maria Santos', amount: 'R$ 5.200', method: 'PIX', status: 'released', date: '20/04/2024' },
  { id: '2', order: '#4520', buyer: 'Carlos Lima', seller: 'João Silva', amount: 'R$ 1.800', method: 'Cartão 3x', status: 'held', date: '19/04/2024' },
  { id: '3', order: '#4519', buyer: 'Fernanda', seller: 'Pedro Costa', amount: 'R$ 3.400', method: 'PIX', status: 'paid', date: '19/04/2024' },
  { id: '4', order: '#4518', buyer: 'Bruno', seller: 'Lucas Ferreira', amount: 'R$ 7.500', method: 'Cartão 6x', status: 'disputed', date: '18/04/2024' },
  { id: '5', order: '#4517', buyer: 'Julia', seller: 'Ana Oliveira', amount: 'R$ 2.800', method: 'Boleto', status: 'pending', date: '18/04/2024' },
];

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-gray-500/10 text-gray-400' },
  paid: { label: 'Pago', color: 'bg-brand-blue/10 text-brand-blue' },
  held: { label: 'Retido', color: 'bg-amber-500/10 text-amber-500' },
  released: { label: 'Liberado', color: 'bg-emerald-500/10 text-emerald-500' },
  refunded: { label: 'Reembolsado', color: 'bg-brand-purple/10 text-brand-purple' },
  disputed: { label: 'Contestado', color: 'bg-red-500/10 text-red-500' },
  failed: { label: 'Falhou', color: 'bg-red-500/10 text-red-500' },
};

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: 'R$ 125.4K', change: '+23%', up: true },
          { label: 'Pendentes', value: 'R$ 12.3K', change: '15 pedidos', up: false },
          { label: 'Retidos', value: 'R$ 8.7K', change: '9 pedidos', up: false },
          { label: 'Contestações', value: '3', change: 'R$ 11.2K', up: false },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <span className="font-display font-bold text-xl text-white">{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
            <span className={`text-[10px] mt-1 inline-flex items-center gap-0.5 ${s.up ? 'text-emerald-400' : 'text-gray-500'}`}>
              {s.up && <ArrowUpRight className="w-3 h-3" />} {s.change}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white">Pagamentos Recentes</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Pedido</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Comprador</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Vendedor</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Valor</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Método</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {MOCK_PAYMENTS.map((p) => (
              <tr key={p.id} className="hover:bg-gray-700/30">
                <td className="px-5 py-3 text-sm text-white font-mono">{p.order}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{p.buyer}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{p.seller}</td>
                <td className="px-5 py-3 text-sm text-white font-display font-semibold">{p.amount}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{p.method}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMap[p.status]?.color}`}>
                    {statusMap[p.status]?.label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button className="p-1.5 hover:bg-gray-600 rounded-lg"><Eye className="w-4 h-4 text-gray-400" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
