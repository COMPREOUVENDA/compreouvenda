'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  created_at?: string;
}

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'Eletrônicos', slug: 'eletronicos', icon: '📱', created_at: '2024-01-01' },
  { id: '2', name: 'Veículos', slug: 'veiculos', icon: '🚗', created_at: '2024-01-01' },
  { id: '3', name: 'Imóveis', slug: 'imoveis', icon: '🏠', created_at: '2024-01-01' },
  { id: '4', name: 'Roupas e Acessórios', slug: 'roupas', icon: '👗', created_at: '2024-01-01' },
  { id: '5', name: 'Esportes', slug: 'esportes', icon: '⚽', created_at: '2024-01-01' },
  { id: '6', name: 'Móveis e Decoração', slug: 'moveis', icon: '🛋️', created_at: '2024-01-01' },
];

const DEFAULT_FORM = { name: '', slug: '', icon: '📦' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories(data && data.length > 0 ? data : MOCK_CATEGORIES);
    } catch {
      setCategories(MOCK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleSlugify = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const openNew = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Nome obrigatório', 'error'); return; }
    if (!form.slug.trim()) { showToast('Slug obrigatório', 'error'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      if (editingId) {
        const { error } = await supabase.from('categories').update(form).eq('id', editingId);
        if (error) throw error;
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, ...form } : c));
        showToast('Categoria atualizada!');
      } else {
        const { data, error } = await supabase.from('categories').insert(form).select().single();
        if (error) throw error;
        setCategories((prev) => [...prev, data]);
        showToast('Categoria criada!');
      }
      setShowForm(false);
      setEditingId(null);
    } catch {
      showToast('Erro ao salvar. Usando modo demo.', 'error');
      if (editingId) {
        setCategories((prev) => prev.map((c) => c.id === editingId ? { ...c, ...form } : c));
      } else {
        setCategories((prev) => [...prev, { ...form, id: Date.now().toString(), created_at: new Date().toISOString() }]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.from('categories').delete().eq('id', id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Categoria removida!');
    } catch {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Removida (modo demo)');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{categories.length} categorias cadastradas</p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-brand-purple text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-purple/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">{editingId ? 'Editar' : 'Nova'} Categoria</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Ícone (emoji)</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="w-20 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-center text-xl focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: handleSlugify(e.target.value) }))}
                  placeholder="Ex: Eletrônicos"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="eletronicos"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white font-mono text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-600">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-purple text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-purple/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Excluir categoria?</h3>
            <p className="text-sm text-gray-400">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-gray-600">Cancelar</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ícone</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Nome</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3 hidden md:table-cell">Slug</th>
              <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {loading ? (
              <tr><td colSpan={4} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-500" /></td></tr>
            ) : categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 text-2xl">{cat.icon}</td>
                <td className="px-5 py-3 text-sm text-white font-medium">{cat.name}</td>
                <td className="px-5 py-3 text-sm text-gray-400 font-mono hidden md:table-cell">{cat.slug}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors" title="Editar">
                      <Pencil className="w-4 h-4 text-brand-purple" />
                    </button>
                    <button onClick={() => setDeleteId(cat.id)} className="p-1.5 hover:bg-gray-600 rounded-lg transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
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
