'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store, Search, RefreshCw, Loader2, Plus, X, Check, AlertTriangle,
  MapPin, Ticket, Megaphone, Users as UsersIcon, Star, ChevronRight, Building2,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Partner {
  id: string;
  legal_name: string;
  trade_name: string;
  tax_id: string;
  category: string;
  status: string;
  plan: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  units_count: number;
  active_units: number;
  cities: string[];
  benefits_total: number;
  benefits_active: number;
  benefits_pending: number;
  campaigns_active: number;
  redemptions: number;
  unique_users: number;
  new_customers: number;
}

interface Kpis {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  inactive: number;
  changes_requested: number;
  benefits_approved: number;
  benefits_pending: number;
  redemptions: number;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Em análise', color: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-400' },
  suspended: { label: 'Suspenso', color: 'bg-orange-500/10 text-orange-400' },
  inactive: { label: 'Inativo', color: 'bg-gray-600/20 text-gray-400' },
  changes_requested: { label: 'Correções solicitadas', color: 'bg-brand-blue/10 text-brand-blue' },
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Gratuito', basic: 'Básico', premium: 'Premium', enterprise: 'Corporativo',
};

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Em análise' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'changes_requested', label: 'Correções' },
  { id: 'suspended', label: 'Suspensos' },
  { id: 'rejected', label: 'Rejeitados' },
  { id: 'inactive', label: 'Inativos' },
];

const CATEGORIES = [
  'Alimentação', 'Vestuário', 'Saúde e Bem-estar', 'Educação', 'Beleza',
  'Serviços', 'Lazer e Entretenimento', 'Automotivo', 'Casa e Construção',
  'Pet', 'Tecnologia', 'Outros',
];

function StatCard({ icon: Icon, label, value, tone = 'text-white' }: {
  icon: React.ElementType; label: string; value: string | number; tone?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className={`text-2xl font-display font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // formulário de cadastro manual
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    legal_name: '', trade_name: '', tax_id: '', category: CATEGORIES[0],
    email: '', phone: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const showMsg = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ status });
      if (search.trim()) qs.set('search', search.trim());
      const data = await adminFetchJson<{ partners: Partner[]; kpis: Kpis }>(
        `/api/admin/partners?${qs.toString()}`
      );
      setPartners(data.partners);
      setKpis(data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar parceiros');
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string, needsReason = false) => {
    let reason = '';
    if (needsReason) {
      reason = prompt('Informe o motivo (será registrado no histórico do parceiro):')?.trim() ?? '';
      if (!reason) return;
    }
    setBusyId(id);
    setError(null);
    try {
      await adminFetchJson('/api/admin/partners', {
        method: 'PATCH',
        body: JSON.stringify({ id, action, reason }),
      });
      showMsg('Cadastro atualizado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminFetchJson('/api/admin/partners', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showMsg('Parceiro cadastrado e enviado para análise.');
      setShowForm(false);
      setForm({ legal_name: '', trade_name: '', tax_id: '', category: CATEGORIES[0], email: '', phone: '', description: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível cadastrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* KPIs do clube */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Building2} label="Parceiros" value={kpis?.total ?? 0} />
        <StatCard icon={AlertTriangle} label="Em análise" value={kpis?.pending ?? 0} tone="text-amber-500" />
        <StatCard icon={Check} label="Aprovados" value={kpis?.approved ?? 0} tone="text-emerald-500" />
        <StatCard icon={Ticket} label="Benefícios ativos" value={kpis?.benefits_approved ?? 0} />
        <StatCard icon={UsersIcon} label="Utilizações" value={kpis?.redemptions ?? 0} />
      </div>

      {(kpis?.benefits_pending ?? 0) > 0 && (
        <Link
          href="/admin/benefits?status=pending"
          className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 hover:bg-amber-500/15 transition-colors"
        >
          <span className="flex items-center gap-3 text-sm text-amber-200">
            <Ticket className="w-5 h-5 text-amber-500 flex-shrink-0" />
            {kpis?.benefits_pending} benefício(s) aguardando aprovação
          </span>
          <ChevronRight className="w-4 h-4 text-amber-500" />
        </Link>
      )}

      {/* Busca + filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome fantasia, razão social, CNPJ ou e-mail..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
          />
        </div>
        <button
          onClick={load}
          className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-brand-purple text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-brand-purple/90"
        >
          <Plus className="w-4 h-4" /> Novo Parceiro
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              status === f.id ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-800 rounded-2xl border border-brand-purple/30 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Cadastrar empresa parceira</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Razão social *</label>
              <input
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome fantasia *</label>
              <input
                value={form.trade_name}
                onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">CNPJ *</label>
              <input
                value={form.tax_id}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                placeholder="00.000.000/0000-00"
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/50"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.legal_name || !form.trade_name || !form.tax_id}
              className="flex-1 bg-brand-purple text-white py-2.5 rounded-xl text-sm font-medium hover:bg-brand-purple/90 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Cadastrar</>}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 text-center py-20 px-5">
          <Store className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhuma empresa parceira encontrada</p>
          <p className="text-sm text-gray-500 mt-1">
            {status === 'all'
              ? 'Cadastre a primeira empresa ou aguarde solicitações pelo Portal do Parceiro.'
              : 'Nenhum parceiro neste status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map((p) => {
            const meta = STATUS_META[p.status] ?? { label: p.status, color: 'bg-gray-600/20 text-gray-400' };
            const busy = busyId === p.id;

            return (
              <div key={p.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.logo_url
                        ? /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.logo_url} alt={p.trade_name} className="w-full h-full object-cover" />
                        : <Store className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/admin/partners/${p.id}`} className="font-semibold text-white hover:text-brand-purple transition-colors">
                          {p.trade_name}
                        </Link>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                          {PLAN_LABEL[p.plan] ?? p.plan}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.category} · CNPJ {p.tax_id}
                      </p>
                      {p.cities.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {p.cities.slice(0, 3).join(', ')}
                          {p.cities.length > 3 && ` +${p.cities.length - 3}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {busy ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        {(p.status === 'pending' || p.status === 'changes_requested') && (
                          <>
                            <button
                              onClick={() => act(p.id, 'approve')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium hover:bg-emerald-500/20"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => act(p.id, 'request_changes', true)}
                              className="px-3 py-1.5 rounded-xl bg-brand-blue/10 text-brand-blue text-xs font-medium hover:bg-brand-blue/20"
                            >
                              Solicitar correção
                            </button>
                            <button
                              onClick={() => act(p.id, 'reject', true)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {p.status === 'approved' && (
                          <button
                            onClick={() => act(p.id, 'suspend', true)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 text-xs font-medium hover:bg-orange-500/20"
                          >
                            Suspender
                          </button>
                        )}
                        {(p.status === 'suspended' || p.status === 'inactive' || p.status === 'rejected') && (
                          <button
                            onClick={() => act(p.id, 'reactivate')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium hover:bg-emerald-500/20"
                          >
                            Reativar
                          </button>
                        )}
                        <Link
                          href={`/admin/partners/${p.id}`}
                          className="p-2 rounded-xl bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title="Ver detalhes"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Indicadores do parceiro */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-gray-700/50">
                  {[
                    { icon: Building2, label: 'Unidades', value: `${p.active_units}/${p.units_count}` },
                    { icon: Ticket, label: 'Benefícios', value: p.benefits_active },
                    { icon: Megaphone, label: 'Campanhas', value: p.campaigns_active },
                    { icon: Check, label: 'Utilizações', value: p.redemptions },
                    { icon: UsersIcon, label: 'Usuários', value: p.unique_users },
                    { icon: Star, label: 'Avaliação', value: p.rating_count > 0 ? p.rating_avg.toFixed(1) : '—' },
                  ].map((m) => (
                    <div key={m.label}>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <m.icon className="w-3 h-3" /> {m.label}
                      </span>
                      <span className="text-sm text-white font-medium">{m.value}</span>
                    </div>
                  ))}
                </div>

                {p.benefits_pending > 0 && (
                  <p className="text-xs text-amber-500 mt-3">
                    {p.benefits_pending} benefício(s) deste parceiro aguardando aprovação
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
