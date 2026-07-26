'use client';

import { GitBranch } from 'lucide-react';

export default function AdminSplitsPage() {
  const splits: {
    order: string;
    buyer: string;
    gross: number;
    platform: number;
    gateway: number;
    seller: number;
    status: 'completed' | 'processing' | 'pending' | 'failed';
    date: string;
  }[] = [];

  const statusColor: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-500',
    processing: 'bg-brand-blue/10 text-brand-blue',
    pending: 'bg-amber-500/10 text-amber-500',
    failed: 'bg-red-500/10 text-red-400',
  };

  const totalGross = splits.reduce((a, s) => a + s.gross, 0);
  const totalPlatform = splits.reduce((a, s) => a + s.platform, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Volume Total', value: `R$ ${totalGross.toLocaleString('pt-BR')}`, color: 'text-white' },
          { label: 'Taxa Plataforma', value: `R$ ${totalPlatform.toLocaleString('pt-BR')}`, color: 'text-brand-purple' },
          { label: 'Splits OK', value: splits.filter((s) => s.status === 'completed').length, color: 'text-emerald-400' },
          { label: 'Com Falha', value: splits.filter((s) => s.status === 'failed').length, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
            <span className={`font-display font-bold text-xl ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500 mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-brand-purple" />
          <h3 className="font-display font-semibold text-white">Splits de Pagamento</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Pedido</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Comprador</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Bruto</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Plataforma</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Gateway</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Líquido</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {splits.map((s) => (
              <tr key={s.order} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 text-sm text-white font-mono">{s.order}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{s.buyer}</td>
                <td className="px-5 py-3 text-sm text-white font-display">R$ {s.gross.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3 text-sm text-red-400 hidden lg:table-cell">- R$ {s.platform.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3 text-sm text-amber-400 hidden lg:table-cell">- R$ {s.gateway.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3 text-sm text-emerald-400 font-display font-semibold">R$ {s.seller.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[s.status]}`}>
                    {s.status === 'completed' ? 'Concluído' : s.status === 'processing' ? 'Processando' : s.status === 'pending' ? 'Pendente' : 'Falhou'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
