'use client';

import { Search, Eye, Pause, Trash2, Play, Film, Video } from 'lucide-react';

const MOCK_ADMIN_PRODUCTS = [
  { id: '1', title: 'iPhone 14 Pro Max', seller: 'Maria Santos', price: 'R$ 5.200', status: 'active', video: 'ready', views: 342, created: '2024-04-20' },
  { id: '2', title: 'Sofá Retrátil 3 Lugares', seller: 'João Silva', price: 'R$ 1.800', status: 'active', video: 'none', views: 156, created: '2024-04-19' },
  { id: '3', title: 'Bicicleta Speed Caloi', seller: 'Ana Oliveira', price: 'R$ 2.800', status: 'active', video: 'processing', views: 89, created: '2024-04-18' },
  { id: '4', title: 'PS5 + 2 Controles', seller: 'Pedro Costa', price: 'R$ 3.400', status: 'paused', video: 'ready', views: 521, created: '2024-04-17' },
  { id: '5', title: 'MacBook Air M2', seller: 'Lucas Ferreira', price: 'R$ 7.500', status: 'sold', video: 'ready', views: 267, created: '2024-04-16' },
];

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: '4.231', color: 'text-white' },
          { label: 'Ativos', value: '3.156', color: 'text-emerald-400' },
          { label: 'Com Vídeo', value: '1.892', color: 'text-brand-blue' },
          { label: 'Vendidos', value: '856', color: 'text-brand-gold' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
            <span className={`font-display font-bold text-xl ${s.color}`}>{s.value}</span>
            <span className="block text-xs text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Produto</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Vendedor</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Preço</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Vídeo</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Views</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {MOCK_ADMIN_PRODUCTS.map((p) => (
              <tr key={p.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 text-sm text-white font-medium">{p.title}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{p.seller}</td>
                <td className="px-5 py-3 text-sm text-white font-display font-semibold">{p.price}</td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.video === 'ready' ? 'bg-emerald-500/10 text-emerald-500' :
                    p.video === 'processing' ? 'bg-brand-blue/10 text-brand-blue' :
                    'bg-gray-600/50 text-gray-500'
                  }`}>
                    {p.video === 'ready' ? '✓ Pronto' : p.video === 'processing' ? '⏳ Processando' : 'Sem vídeo'}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{p.views}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                    p.status === 'sold' ? 'bg-brand-gold/10 text-brand-gold' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>{p.status === 'active' ? 'Ativo' : p.status === 'sold' ? 'Vendido' : 'Pausado'}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-gray-600 rounded-lg"><Eye className="w-4 h-4 text-gray-400" /></button>
                    <button className="p-1.5 hover:bg-gray-600 rounded-lg"><Pause className="w-4 h-4 text-amber-400" /></button>
                    <button className="p-1.5 hover:bg-gray-600 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
