'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Tag, Plus, Trash2, Check, X, Loader2, Copy,
  Edit3, ToggleLeft, ToggleRight, Download, Search, ArrowLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

const supabase = createClient();

interface Coupon {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  min_order_value: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number | null;
  valid_until: string | null;
  applies_to: string;
  active: boolean;
  created_at: string;
}

const BLANK: Omit<Coupon, 'id' | 'usage_count' | 'created_at'> = {
  code: '',
  description: '',
  type: 'percentage',
  value: 10,
  min_order_value: 0,
  max_discount: null,
  usage_limit: null,
  per_user_limit: 1,
  valid_until: null,
  applies_to: 'all',
  active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const saveCoupon = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    const payload = { ...form, code: form.code.toUpperCase() };
    const { error } = await supabase.from('coupons').insert(payload);
    if (!error) {
      setShowForm(false);
      setForm({ ...BLANK });
      loadCoupons();
    }
    setSaving(false);
  };

  const toggleActive = async (coupon: Coupon) => {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, active: !c.active } : c));
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Excluir este cupom?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportCSV = () => {
    window.open('/api/admin/export?type=coupons', '_blank');
  };

  const filtered = search.trim()
    ? coupons.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase()))
    : coupons;

  const active = coupons.filter((c) => c.active).length;
  const totalUsage = coupons.reduce((s, c) => s + c.usage_count, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display font-bold text-xl text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-purple" /> Cupons de Desconto
          </h1>
          <p className="text-xs text-gray-400">{active} ativos · {totalUsage} usos totais</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Download className="w-4 h-4" /> Exportar
        </button>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Novo cupom
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="card p-5 mb-6 border-2 border-brand-purple/20 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900">Novo cupom</h3>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-xl">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-sm">Código</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="CUPOM10"
                className="input-field uppercase tracking-widest"
              />
            </div>
            <div>
              <label className="label-sm">Descrição</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Desconto de boas-vindas"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-sm">Tipo de desconto</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="label-sm">Valor ({form.type === 'percentage' ? '%' : 'R$'})</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) })}
                className="input-field"
                min={0}
                step={form.type === 'percentage' ? '1' : '0.01'}
                max={form.type === 'percentage' ? '100' : undefined}
              />
            </div>
            <div>
              <label className="label-sm">Pedido mínimo (R$)</label>
              <input
                type="number"
                value={form.min_order_value}
                onChange={(e) => setForm({ ...form, min_order_value: parseFloat(e.target.value) })}
                className="input-field"
                min={0}
              />
            </div>
            <div>
              <label className="label-sm">Limite de usos</label>
              <input
                type="number"
                value={form.usage_limit || ''}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Ilimitado"
                className="input-field"
                min={1}
              />
            </div>
            <div>
              <label className="label-sm">Usos por usuário</label>
              <input
                type="number"
                value={form.per_user_limit || ''}
                onChange={(e) => setForm({ ...form, per_user_limit: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="1"
                className="input-field"
                min={1}
              />
            </div>
            <div>
              <label className="label-sm">Válido até</label>
              <input
                type="datetime-local"
                value={form.valid_until || ''}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value || null })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-sm">Aplicável a</label>
              <select value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value })} className="input-field">
                <option value="all">Todos</option>
                <option value="products">Produtos</option>
                <option value="subscription">Assinatura</option>
                <option value="boost">Destaque</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={saveCoupon} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Criar cupom
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código ou descrição..."
          className="input-field pl-10"
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum cupom encontrado</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Código</th>
                  <th className="px-4 py-3 text-left">Desconto</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Usos</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Validade</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">{coupon.code}</span>
                        <button onClick={() => copyCode(coupon.code)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                          {copied === coupon.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                        </button>
                      </div>
                      {coupon.description && <p className="text-xs text-gray-400 mt-0.5">{coupon.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-brand-purple">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : formatPrice(coupon.value)}
                      </span>
                      {coupon.min_order_value > 0 && (
                        <p className="text-xs text-gray-400">Mín. {formatPrice(coupon.min_order_value)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-gray-700">{coupon.usage_count}</span>
                      {coupon.usage_limit && <span className="text-gray-400">/{coupon.usage_limit}</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-500">
                      {coupon.valid_until
                        ? new Date(coupon.valid_until).toLocaleDateString('pt-BR')
                        : <span className="text-gray-300">Sem validade</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(coupon)}>
                        {coupon.active
                          ? <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" />
                          : <ToggleLeft className="w-6 h-6 text-gray-300 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteCoupon(coupon.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
