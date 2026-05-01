'use client';
import { Heart, CheckCircle, XCircle, Eye } from 'lucide-react';
const CHARITIES = [
  { id: '1', name: 'AACD', email: 'contato@aacd.org', verified: true, total: 'R$ 3.450', donations: 42 },
  { id: '2', name: 'Cruz Vermelha', email: 'info@cruzvermelha.org', verified: true, total: 'R$ 2.890', donations: 31 },
  { id: '3', name: 'UNICEF', email: 'brasil@unicef.org', verified: true, total: 'R$ 2.050', donations: 28 },
  { id: '4', name: 'Casa do Menor', email: 'contato@casadomenor.org', verified: false, total: 'R$ 0', donations: 0 },
];
export default function AdminCharitiesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700"><h3 className="font-display font-semibold text-white">Instituições Beneficentes</h3></div>
        <div className="divide-y divide-gray-700/50">
          {CHARITIES.map((c) => (
            <div key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-700/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Heart className="w-5 h-5 text-emerald-500" /></div>
                <div>
                  <span className="text-sm text-white font-medium">{c.name}</span>
                  <span className="block text-xs text-gray-500">{c.email} · {c.donations} doações</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-emerald-400 font-semibold">{c.total}</span>
                {c.verified ? (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">✓ Verificada</span>
                ) : (
                  <button className="text-[10px] bg-brand-blue/10 text-brand-blue font-bold px-2 py-0.5 rounded-full hover:bg-brand-blue/20">Verificar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
