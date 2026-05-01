'use client';
import { LifeBuoy, MessageCircle } from 'lucide-react';
const TICKETS = [
  { id: '1', user: 'Ana Oliveira', subject: 'Pagamento não liberado', priority: 'high', status: 'open', date: '20/04' },
  { id: '2', user: 'João Silva', subject: 'Vídeo não gerou', priority: 'medium', status: 'in_progress', date: '19/04' },
  { id: '3', user: 'Pedro Costa', subject: 'Conta suspensa indevidamente', priority: 'urgent', status: 'open', date: '19/04' },
  { id: '4', user: 'Carla Lima', subject: 'Dúvida sobre comissão', priority: 'low', status: 'resolved', date: '18/04' },
];
const priorityColor: Record<string, string> = { low: 'text-gray-400', medium: 'text-brand-blue', high: 'text-brand-orange', urgent: 'text-red-500' };
const priorityLabel: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' };
export default function AdminSupportPage() {
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-brand-blue" /> Tickets de Suporte</h3></div>
      <div className="divide-y divide-gray-700/50">
        {TICKETS.map((t) => (
          <div key={t.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-700/30">
            <div>
              <span className="text-sm text-white font-medium">{t.subject}</span>
              <span className="block text-xs text-gray-500">{t.user} · {t.date}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${priorityColor[t.priority]}`}>{priorityLabel[t.priority]}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-amber-500/10 text-amber-500' : t.status === 'in_progress' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {t.status === 'open' ? 'Aberto' : t.status === 'in_progress' ? 'Em andamento' : 'Resolvido'}
              </span>
              <button className="p-1.5 hover:bg-gray-600 rounded-lg"><MessageCircle className="w-4 h-4 text-gray-400" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
