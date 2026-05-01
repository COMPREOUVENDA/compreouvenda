'use client';
import { Flag, Eye, CheckCircle, XCircle } from 'lucide-react';
const REPORTS = [
  { id: '1', reporter: 'Ana Oliveira', type: 'Produto', target: 'Produto #892', reason: 'Spam / Anúncio falso', status: 'pending', date: '20/04' },
  { id: '2', reporter: 'Carlos Lima', type: 'Usuário', target: 'Pedro Costa', reason: 'Comportamento abusivo', status: 'reviewing', date: '19/04' },
  { id: '3', reporter: 'Fernanda', type: 'Mensagem', target: 'Conversa #123', reason: 'Tentativa de golpe', status: 'resolved', date: '18/04' },
];
export default function AdminReportsPage() {
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white flex items-center gap-2"><Flag className="w-5 h-5 text-red-400" /> Denúncias</h3></div>
      <table className="w-full">
        <thead><tr className="border-b border-gray-700">
          <th className="text-left text-xs text-gray-500 px-5 py-3">Denunciante</th>
          <th className="text-left text-xs text-gray-500 px-5 py-3">Tipo</th>
          <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">Alvo</th>
          <th className="text-left text-xs text-gray-500 px-5 py-3">Motivo</th>
          <th className="text-left text-xs text-gray-500 px-5 py-3">Status</th>
          <th className="text-left text-xs text-gray-500 px-5 py-3">Ações</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-700/50">
          {REPORTS.map((r) => (
            <tr key={r.id} className="hover:bg-gray-700/30">
              <td className="px-5 py-3 text-sm text-white">{r.reporter}</td>
              <td className="px-5 py-3 text-sm text-gray-400">{r.type}</td>
              <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{r.target}</td>
              <td className="px-5 py-3 text-sm text-gray-400">{r.reason}</td>
              <td className="px-5 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : r.status === 'reviewing' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-emerald-500/10 text-emerald-500'}`}>{r.status === 'pending' ? 'Pendente' : r.status === 'reviewing' ? 'Analisando' : 'Resolvido'}</span></td>
              <td className="px-5 py-3"><div className="flex gap-1"><button className="p-1.5 hover:bg-gray-600 rounded-lg"><Eye className="w-4 h-4 text-gray-400" /></button><button className="p-1.5 hover:bg-gray-600 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-400" /></button><button className="p-1.5 hover:bg-gray-600 rounded-lg"><XCircle className="w-4 h-4 text-red-400" /></button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
