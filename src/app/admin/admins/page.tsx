'use client';

import { useState } from 'react';
import { Shield, Plus, Trash2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-500/10 text-red-400' },
  { value: 'admin_operational', label: 'Operacional', color: 'bg-brand-purple/10 text-brand-purple' },
  { value: 'admin_financial', label: 'Financeiro', color: 'bg-emerald-500/10 text-emerald-500' },
  { value: 'admin_support', label: 'Suporte', color: 'bg-brand-blue/10 text-brand-blue' },
  { value: 'admin_moderation', label: 'Moderação', color: 'bg-amber-500/10 text-amber-500' },
  { value: 'admin_content', label: 'Conteúdo', color: 'bg-brand-orange/10 text-brand-orange' },
];

export default function AdminAdminsPage() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin_operational');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('users').update({ role }).eq('email', email.trim().toLowerCase());
      if (error) throw error;
      showMsg('Permissão atualizada com sucesso!');
      setShowForm(false);
      setEmail('');
    } catch {
      showMsg('Erro ao atualizar. Verifique se o usuário está cadastrado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Gerencie permissões de administradores</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-purple text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-purple/90"
        >
          <Plus className="w-4 h-4" /> Adicionar Admin
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-2xl border border-brand-purple/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Promover usuário a administrador</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">E-mail do usuário</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nível de acesso</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button
              onClick={handleAdd}
              disabled={saving || !email.trim()}
              className="flex-1 bg-brand-purple text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-purple/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? 'Salvando...' : <><Check className="w-4 h-4" /> Confirmar</>}
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-purple" /> Níveis de Acesso
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="flex items-center gap-3 bg-gray-700/30 rounded-xl px-4 py-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
              <span className="text-xs text-gray-500 font-mono">{r.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Para promover um usuário, use o botão &quot;Adicionar Admin&quot; acima ou execute o script <code className="text-brand-purple">scripts/create-admin-user.js</code>.
        </p>
      </div>
    </div>
  );
}
