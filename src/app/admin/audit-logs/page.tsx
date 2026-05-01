'use client';

import { ScrollText } from 'lucide-react';

const MOCK_LOGS = [
  { id: '1', admin: 'Super Admin', action: 'Usuário suspenso', entity: 'Pedro Costa (user)', ip: '192.168.1.100', time: '20/04 14:30' },
  { id: '2', admin: 'Admin Financeiro', action: 'Pagamento liberado', entity: 'Pedido #4521', ip: '192.168.1.101', time: '20/04 13:15' },
  { id: '3', admin: 'Admin Moderação', action: 'Produto removido', entity: 'Produto #892 (spam)', ip: '192.168.1.102', time: '20/04 12:00' },
  { id: '4', admin: 'Admin Conteúdo', action: 'Categoria criada', entity: 'Instrumentos Musicais', ip: '192.168.1.103', time: '20/04 10:30' },
  { id: '5', admin: 'Super Admin', action: 'Instituição verificada', entity: 'AACD', ip: '192.168.1.100', time: '19/04 16:00' },
  { id: '6', admin: 'Admin Suporte', action: 'Ticket resolvido', entity: 'Ticket #234', ip: '192.168.1.104', time: '19/04 14:20' },
];

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-gray-400" />
          <h3 className="font-display font-semibold text-white">Logs de Auditoria</h3>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-700">
            <th className="text-left text-xs text-gray-500 px-5 py-3">Admin</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Ação</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">Entidade</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3 hidden md:table-cell">IP</th>
            <th className="text-left text-xs text-gray-500 px-5 py-3">Data</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-700/50">
            {MOCK_LOGS.map((l) => (
              <tr key={l.id} className="hover:bg-gray-700/30">
                <td className="px-5 py-3 text-sm text-white">{l.admin}</td>
                <td className="px-5 py-3 text-sm text-gray-300">{l.action}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">{l.entity}</td>
                <td className="px-5 py-3 text-xs text-gray-600 font-mono hidden md:table-cell">{l.ip}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{l.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
