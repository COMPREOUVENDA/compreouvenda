'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Loader2, Shield, Ban, CheckCircle, Star, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UserRow {
  id: string;
  name: string;
  email: string;
  type: string;
  role?: string;
  city?: string;
  state?: string;
  status?: string;
  is_pro?: boolean;
  created_at: string;
}

const MOCK_USERS: UserRow[] = [
  { id: '1', name: 'Maria Santos', email: 'maria@email.com', type: 'seller', role: 'user', city: 'São Paulo', state: 'SP', is_pro: true, created_at: '2024-01-15', status: 'active' },
  { id: '2', name: 'João Silva', email: 'joao@email.com', type: 'seller', role: 'user', city: 'Rio de Janeiro', state: 'RJ', is_pro: false, created_at: '2024-02-20', status: 'active' },
  { id: '3', name: 'Ana Oliveira', email: 'ana@email.com', type: 'buyer', role: 'user', city: 'Belo Horizonte', state: 'MG', is_pro: false, created_at: '2024-03-10', status: 'active' },
  { id: '4', name: 'Pedro Costa', email: 'pedro@email.com', type: 'seller', role: 'user', city: 'Curitiba', state: 'PR', is_pro: false, created_at: '2024-04-01', status: 'suspended' },
  { id: '5', name: 'AACD', email: 'contato@aacd.org', type: 'charity', role: 'user', city: 'São Paulo', state: 'SP', is_pro: false, created_at: '2024-01-01', status: 'verified' },
];

type FilterType = 'all' | 'buyer' | 'seller' | 'charity' | 'admin';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('id, name, email, type, role, city, state, is_pro, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      setUsers(data && data.length > 0 ? data : MOCK_USERS);
    } catch {
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleRole = async (user: UserRow) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setActionId(user.id);
    try {
      const supabase = createClient();
      await supabase.from('users').update({ role: newRole }).eq('id', user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      showToast(`Papel alterado para ${newRole}`);
    } catch {
      showToast('Erro ao alterar papel', 'error');
    } finally {
      setActionId(null);
    }
  };

  const toggleStatus = async (user: UserRow) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    setActionId(user.id);
    try {
      const supabase = createClient();
      await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
      showToast(`Usuário ${newStatus === 'active' ? 'ativado' : 'suspenso'}`);
    } catch {
      // Update locally in demo mode
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
      showToast(`Usuário ${newStatus === 'active' ? 'ativado' : 'suspenso'} (modo demo)`);
    } finally {
      setActionId(null);
    }
  };

  const filtered = users.filter((u) => {
    if (filter === 'admin' && u.role !== 'admin') return false;
    if (filter !== 'all' && filter !== 'admin' && u.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'buyer', 'seller', 'charity', 'admin'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f ? 'bg-brand-purple text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'buyer' ? 'Compradores' : f === 'seller' ? 'Vendedores' : f === 'charity' ? 'Instituições' : 'Admins'}
            </button>
          ))}
          <button onClick={fetchUsers} disabled={loading} className="p-2 bg-gray-700 rounded-xl text-gray-400 hover:text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Usuário</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Tipo</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Localização</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden lg:table-cell">Cadastro</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-500 text-sm">Nenhum usuário encontrado</td></tr>
            ) : filtered.map((user) => (
              <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {user.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium">{user.name}</span>
                        {user.is_pro && <span className="bg-yellow-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">PRO</span>}
                        {user.role === 'admin' && <span className="bg-brand-purple text-white text-[8px] font-bold px-1 py-0.5 rounded">ADMIN</span>}
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
                <td className="px-5 py-3 text-sm text-gray-400 hidden md:table-cell">
                  {user.city && user.state ? `${user.city}, ${user.state}` : '—'}
                </td>
                <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">
                  {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                    user.status === 'verified' ? 'bg-brand-blue/10 text-brand-blue' :
                    user.status === 'suspended' ? 'bg-red-500/10 text-red-500' :
                    'bg-gray-600/50 text-gray-400'
                  }`}>
                    {user.status === 'active' ? 'Ativo' : user.status === 'verified' ? 'Verificado' : user.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={actionId === user.id}
                      title={user.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                      className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Shield className={`w-4 h-4 ${user.role === 'admin' ? 'text-brand-purple' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={actionId === user.id}
                      title={user.status === 'suspended' ? 'Reativar' : 'Suspender'}
                      className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {user.status === 'suspended'
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <Ban className="w-4 h-4 text-red-400" />
                      }
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500">{filtered.length} de {users.length} usuários</span>
        </div>
      </div>
    </div>
  );
}
