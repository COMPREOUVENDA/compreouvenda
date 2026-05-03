'use client';

import { MapPin } from 'lucide-react';

export default function AdminGeoPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <h3 className="font-display font-semibold text-white flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-brand-purple" /> Geolocalização
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Usuários com Localização', value: '8.412', color: 'text-emerald-400' },
            { label: 'Raio Médio (km)', value: '47', color: 'text-brand-blue' },
            { label: 'Negociações Locais', value: '2.341', color: 'text-brand-purple' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-700/50 rounded-xl p-4 text-center">
              <span className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</span>
              <span className="block text-xs text-gray-500 mt-1">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-700/30 rounded-xl h-64 flex items-center justify-center border border-gray-600 border-dashed">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Mapa de calor de usuários</p>
            <p className="text-gray-600 text-xs mt-1">Integração com Mapbox/Google Maps</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h3 className="font-display font-semibold text-white">Top Cidades</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Cidade / Estado</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Usuários</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Produtos</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Negociações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {[
              { city: 'São Paulo', state: 'SP', users: 3241, products: 1432, trades: 876 },
              { city: 'Rio de Janeiro', state: 'RJ', users: 1892, products: 841, trades: 543 },
              { city: 'Belo Horizonte', state: 'MG', users: 1023, products: 456, trades: 321 },
              { city: 'Curitiba', state: 'PR', users: 876, products: 398, trades: 243 },
              { city: 'Porto Alegre', state: 'RS', users: 654, products: 287, trades: 198 },
            ].map((r) => (
              <tr key={r.city} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3">
                  <span className="text-sm text-white font-medium">{r.city}</span>
                  <span className="text-xs text-gray-500 ml-2">{r.state}</span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-300">{r.users.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3 text-sm text-gray-300 hidden md:table-cell">{r.products.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3 text-sm text-gray-300 hidden md:table-cell">{r.trades.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
