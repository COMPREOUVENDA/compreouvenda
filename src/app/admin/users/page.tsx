'use client';

import { useState } from 'react';
import { Search, Filter, MoreHorizontal, Shield, Ban, CheckCircle, Star, Eye } from 'lucide-react';

const MOCK_USERS = [
  { id: '1', name: 'Maria Santos', email: 'maria@email.com', type: 'seller', status: 'active', products: 12, sales: 8, rating: 4.8, isPro: true, created: '2024-01-15' },
  { id: '2', name: 'João Silva', email: 'joao@email.com', type: 'seller', status: 'active', products: 5, sales: 3, rating: 4.5, isPro: false, created: '2024-02-20' },
  { id: '3', name: 'Ana Oliveira', email: 'ana@email.com', type: 'buyer', status: 'active', products: 0, sales: 0, rating: 4.9, isPro: false, created: '2024-03-10' },
  { id: '4', name: 'Pedro Costa', email: 'pedro@email.com', type: 'seller', status: 'suspended', products: 3, sales: 1, rating: 3.2, isPro: false, created: '2024-04-01' },
  { id: '5', name: 'AACD', email: 'contato@aacd.org', type: 'charity', status: 'verified', products: 0, sales: 0, rating: 5.0, isPro: false, created: '2024-01-01' },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = MOCK_USERS.filter((u) => {
    if (filter !== 'all' && u.type !== filter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'buyer', 'seller', 'charity'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'buyer' ? 'Compradores' : f === 'seller' ? 'Vendedores' : 'Instituições'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Usuário</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Tipo</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Produtos</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Vendas</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Rating</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium">{user.name}</span>
                        {user.isPro && <span className="bg-brand-gold text-white text-[8px] font-bold px-1 py-0.5 rounded">PRO</span>}
                      </div>
                      <span className="text-xs text-gray-500">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.type === 'seller' ? 'bg-brand-orange/10 text-brand-orange' :
                    user.type === 'charity' ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-brand-blue/10 text-brand-blue'
                  }`}>
                    {user.type === 'seller' ? 'Vendedor' : user.type === 'charity' ? 'Instituição' : 'Comprador'}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{user.products}</td>
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">{user.sales}</td>
                <td className="px-5 py-3 hidden md:table-cell">
                  <span className="text-sm text-brand-gold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-brand-gold" /> {user.rating}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                    user.status === 'verified' ? 'bg-brand-blue/10 text-brand-blue' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {user.status === 'active' ? 'Ativo' : user.status === 'verified' ? 'Verificado' : 'Suspenso'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors" title="Ver"><Eye className="w-4 h-4 text-gray-400" /></button>
                    <button className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors" title="Verificar"><CheckCircle className="w-4 h-4 text-emerald-400" /></button>
                    <button className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors" title="Banir"><Ban className="w-4 h-4 text-red-400" /></button>
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
