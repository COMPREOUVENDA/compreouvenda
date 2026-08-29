'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Ticket, Search, RefreshCw, Loader2, AlertTriangle, Check, Store,
  Users as UsersIcon, TrendingUp, Percent, Clock, Ban,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

interface Benefit {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_category: string | null;
  partner_status: string | null;
  title: string;
  description: string | null;
  benefit_type: string;
  discount_percent: number | null;
  discount_value: number | null;
  min_purchase_value: number | null;
  terms: string | null;
  rules: string | null;
  starts_at: string | null;
  ends_at: string | null;
  total_quantity: number | null;
  used_quantity: number;
  status: string;
  rejection_reason: string | null;
  units_count: number;
  redemptions_validated: number;
  unique_users: number;
  new_customers: number;
  volume: number;
  discount_granted: number;
  is_live: boolean;
  blocked_by_partner: boolean;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-600/20 text-gray-400' },
  pending: { label: 'Em análise', color: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-400' },
  paused: { label: 'Pausado', color: 'bg-orange-500/10 text-orange-400' },
  expired: { label: 'Expirado', color: 'bg-gray-600/20 text-gray-400' },
};

const TYPE_LABEL: Record<string, string> = {
  percent_discount: 'Desconto percentual',
  fixed_discount: 'Desconto fixo',
  cashback: 'Cashback',
  gift: 'Brinde',
  combo: 'Combo',
  free_shipping: 'Frete grátis',
  other: 'Outro',
};

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Em análise' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'paused', label: 'Pausados' },
  { id: 'rejected', label: 'Rejeitados' },
  { id: 'expired', label: 'Expirados' },
];

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : 'sem prazo';

export default function AdminBenefitsPage() {
  const searchParams = useSearchParams();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? 'all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const showMsg = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ status });
      if (search.trim()) qs.set('search', search.trim());
      const partner = searchParams.get('partner_id');
      if (partner) qs.set('partner_id', partner);
      const data = await adminFetchJson<{ benefits: Benefit[]; kpis: any }>(
        `/api/admin/benefits?${qs.toString()}`
      );
      setBenefits(data.benefits);
      setKpis(data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar benefícios');
      setBenefits([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, searchParams]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: string, needsReason = false) => {
    let reason = '';
    if (needsReason) {
      reason = prompt('Motivo da rejeição (será enviado ao parceiro):')?.trim() ?? '';
      if (!reason) return;
    }
    setBusyId(id);
    setError(null);
    try {
      await adminFetchJson('/api/admin/benefits', {
        method: 'PATCH',
        body: JSON.stringify({ id, action, reason }),
      });
      showMsg('Benefício atualizado.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: Ticket, label: 'Benefícios', value: kpis?.total ?? 0, tone: 'text-white' },
          { icon: Clock, label: 'Em análise', value: kpis?.pending ?? 0, tone: 'text-amber-500' },
          { icon: Check, label: 'Aprovados', value: kpis?.approved ?? 0, tone: 'text-emerald-500' },
          { icon: TrendingUp, label: 'No ar agora', value: kpis?.live ?? 0, tone: 'text-brand-purple' },
          { icon: Ban, label: 'Bloqueados', value: kpis?.blocked ?? 0, tone: 'text-red-400' },
        ].map((m) => (
          <div key={m.label} className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <m.icon className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
            <p className={`text-2xl font-display font-bold ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {(kpis?.blocked ?? 0) > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">
            {kpis.blocked} benefício(s) aprovado(s) não estão visíveis no aplicativo porque a
            empresa parceira não está com o cadastro aprovado.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar benefício pelo título..."
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-purple animate-spin" />
        </div>
      ) : benefits.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 text-center py-20 px-5">
          <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum benefício encontrado</p>
          <p className="text-sm text-gray-500 mt-1">
            Os benefícios são criados pelas empresas no Portal do Parceiro e chegam aqui para aprovação.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {benefits.map((b) => {
            const meta = STATUS_META[b.status] ?? { label: b.status, color: 'bg-gray-600/20 text-gray-400' };
            const busy = busyId === b.id;
            const vantagem = b.discount_percent
              ? `${b.discount_percent}%`
              : b.discount_value ? brl(Number(b.discount_value)) : TYPE_LABEL[b.benefit_type] ?? b.benefit_type;

            return (
              <div key={b.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{b.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      {b.is_live && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">
                          no ar
                        </span>
                      )}
                      {b.blocked_by_partner && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                          parceiro não aprovado
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/admin/partners/${b.partner_id}`}
                      className="text-xs text-gray-400 hover:text-brand-purple transition-colors mt-1 inline-flex items-center gap-1"
                    >
                      <Store className="w-3 h-3" /> {b.partner_name}
                      {b.partner_category && ` · ${b.partner_category}`}
                    </Link>

                    {b.description && (
                      <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{b.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1 text-brand-purple font-medium">
                        <Percent className="w-3 h-3" /> {vantagem}
                      </span>
                      <span>{date(b.starts_at)} até {date(b.ends_at)}</span>
                      <span>
                        Utilizações: {b.used_quantity}
                        {b.total_quantity ? ` de ${b.total_quantity}` : ' (ilimitado)'}
                      </span>
                      {b.units_count > 0 && <span>{b.units_count} unidade(s)</span>}
                    </div>

                    {b.rejection_reason && (
                      <p className="text-xs text-red-400 mt-2">
                        <strong>Motivo:</strong> {b.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {busy ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        {(b.status === 'pending' || b.status === 'draft') && (
                          <>
                            <button
                              onClick={() => act(b.id, 'approve')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium hover:bg-emerald-500/20"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => act(b.id, 'reject', true)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {b.status === 'approved' && (
                          <button
                            onClick={() => act(b.id, 'pause')}
                            className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 text-xs font-medium hover:bg-orange-500/20"
                          >
                            Pausar
                          </button>
                        )}
                        {(b.status === 'paused' || b.status === 'rejected') && (
                          <button
                            onClick={() => act(b.id, 'resume')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-medium hover:bg-emerald-500/20"
                          >
                            Reativar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {b.redemptions_validated > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-700/50">
                    {[
                      { icon: Check, label: 'Validações', value: b.redemptions_validated },
                      { icon: UsersIcon, label: 'Usuários', value: b.unique_users },
                      { icon: TrendingUp, label: 'Novos clientes', value: b.new_customers },
                      { icon: Percent, label: 'Volume gerado', value: brl(b.volume) },
                    ].map((m) => (
                      <div key={m.label}>
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <m.icon className="w-3 h-3" /> {m.label}
                        </span>
                        <span className="text-sm text-white font-medium">{m.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
