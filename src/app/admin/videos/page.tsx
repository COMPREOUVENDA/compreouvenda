'use client';

import { Sparkles, Film, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const MOCK_VIDEOS = [
  { id: '1', product: 'iPhone 14 Pro Max', type: 'template', status: 'ready', duration: '20s', generatedAt: '20/04/2024 14:30', regenerations: 0 },
  { id: '2', product: 'Sofá Retrátil', type: 'template', status: 'processing', duration: '-', generatedAt: '-', regenerations: 0 },
  { id: '3', product: 'PS5 + 2 Controles', type: 'pika', status: 'ready', duration: '18s', generatedAt: '19/04/2024 10:15', regenerations: 1 },
  { id: '4', product: 'Bicicleta Speed', type: 'template', status: 'failed', duration: '-', generatedAt: '-', regenerations: 2 },
  { id: '5', product: 'MacBook Air M2', type: 'runway', status: 'ready', duration: '20s', generatedAt: '18/04/2024 09:00', regenerations: 0 },
];

export default function AdminVideosPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Gerados', value: '1.892', icon: Film, color: 'bg-brand-blue/10 text-brand-blue' },
          { label: 'Modelo (Grátis)', value: '1.540', icon: Film, color: 'bg-emerald-500/10 text-emerald-500' },
          { label: 'Pika IA', value: '280', icon: Sparkles, color: 'bg-brand-purple/10 text-brand-purple' },
          { label: 'Runway', value: '72', icon: Sparkles, color: 'bg-brand-gold/10 text-brand-gold' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-xl text-white">{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white">Vídeos Recentes</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Produto</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Tipo</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Duração</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Regenerações</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Gerado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {MOCK_VIDEOS.map((v) => (
              <tr key={v.id} className="hover:bg-gray-700/30">
                <td className="px-5 py-3 text-sm text-white">{v.product}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.type === 'template' ? 'bg-emerald-500/10 text-emerald-500' :
                    v.type === 'pika' ? 'bg-brand-purple/10 text-brand-purple' :
                    'bg-brand-gold/10 text-brand-gold'
                  }`}>{v.type === 'template' ? 'Modelo' : v.type === 'pika' ? 'Pika IA' : 'Runway'}</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${
                    v.status === 'ready' ? 'text-emerald-400' :
                    v.status === 'processing' ? 'text-brand-blue' :
                    'text-red-400'
                  }`}>
                    {v.status === 'ready' ? <CheckCircle className="w-3 h-3" /> : v.status === 'processing' ? <Clock className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                    {v.status === 'ready' ? 'Pronto' : v.status === 'processing' ? 'Processando' : 'Falhou'}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{v.duration}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{v.regenerations}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{v.generatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
