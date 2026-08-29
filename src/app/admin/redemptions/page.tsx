'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  QrCode, RefreshCw, Loader2, AlertTriangle, Store, Check, Clock, X,
  ShieldCheck, Eye, DollarSign, Users as UsersIcon, MapPin, Percent,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando', color: 'bg-amber-500/10 text-amber-500' },
  validated: { label: 'Validado', color: 'bg-emerald-500/10 text-emerald-500' },
  expired: { label: 'Expirado', color: 'bg-gray-600/20 text-gray-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400' },
};

const METHOD_LABEL: Record<string, string> = {
  qr_code: 'QR Code', code: 'Código', manual: 'Manual',
};

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'validated', label: 'Validadas' },
  { id: 'pending', label: 'Aguardando' },
  { id: 'expired', label: 'Expiradas' },
  { id: 'cancelled', label: 'Canceladas' },
];

const PERIODS = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '90 dias' },
];

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (v: string | null) => v ? new Date(v).toLocaleString('pt-BR') : '—';

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('30');
  const [revealed, setRevealed] = useState<Record<string, any>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchJson<{ redemptions: any[]; kpis: any }>(
        `/api/admin/redemptions?status=${status}&period=${period}`
      );
      setRedemptions(data.redemptions);
      setKpis(data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar validações');
      setRedemptions([]);
    } finally {
      setLoading(false);
    }
  }, [status, period]);

  useEffect(() => { load(); }, [load]);

  const reveal = async (id: string) => {
    if (!confirm(
      'Você está prestes a acessar dados pessoais de um usuário.\n\n' +
      'Este acesso será registrado nos logs de auditoria, conforme a LGPD.\n\n' +
      'Confirma que existe uma necessidade legítima para esta consulta?'
    )) return;

    setRevealing(id);
    try {
      const data = await adminFetchJson<{ user: any }>(`/api/admin/redemptions?reveal=${id}`);
      setRevealed((prev) => ({ ...prev, [id]: data.user }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível consultar');
    } finally {
      setRevealing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aviso LGPD */}
      <div className="bg-brand-purple/10 border border-brand-purple/30 rounded-2xl px-5 py-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-purple flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-white font-medium">Proteção de dados pessoais</p>
          <p className="text-xs text-gray-400 mt-1">
            Esta listagem não exibe nome, e-mail ou telefone dos usuários. Quando houver
            necessidade legítima, o dado pode ser consultado individualmente — e cada consulta
            fica registrada nos logs de auditoria com o administrador responsável.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: QrCode, label: 'Validações', value: kpis?.total ?? 0, tone: 'text-white' },
          { icon: Check, label: 'Confirmadas', value: kpis?.validated ?? 0, tone: 'text-emerald-500' },
          { icon: Clock, label: 'Aguardando', value: kpis?.pending ?? 0, tone: 'text-amber-500' },
          { icon: UsersIcon, label: 'Usuários', value: kpis?.unique_users ?? 0, tone: 'text-white' },
          { icon: DollarSign, label: 'Volume', value: brl(kpis?.volume ?? 0), tone: 'text-white' },
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

      {kpis?.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Taxa de conversão', value: `${kpis.conversion_rate}%`, hint: 'validadas sobre o total gerado' },
            { label: 'Via QR Code', value: kpis.by_qr },
            { label: 'Via código', value: kpis.by_code },
            { label: 'Desconto concedido', value: brl(kpis.discount_granted) },
          ].map((m) => (
            <div key={m.label} className="bg-gray-800 rounded-2xl border border-gray-700 px-4 py-3">
              <span className="text-xs text-gray-400">{m.label}</span>
              <p className="text-lg font-display font-bold text-white">{m.value}</p>
              {m.hint && <p className="text-[11px] text-gray-500">{m.hint}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1">
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
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                period === p.id ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={load}
            className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
      ) : redemptions.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 text-center py-20 px-5">
          <QrCode className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhuma validação registrada</p>
          <p className="text-sm text-gray-500 mt-1">
            As validações aparecem aqui quando os usuários utilizarem benefícios nas empresas parceiras.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {redemptions.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, color: 'bg-gray-600/20 text-gray-400' };
            const user = revealed[r.id];

            return (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-white font-medium">{r.benefit_title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                        {METHOD_LABEL[r.method] ?? r.method}
                      </span>
                      {r.is_new_customer && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">
                          novo cliente
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/admin/partners/${r.partner_id}`}
                      className="text-xs text-gray-400 hover:text-brand-purple transition-colors mt-1 inline-flex items-center gap-1"
                    >
                      <Store className="w-3 h-3" /> {r.partner_name}
                    </Link>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                      <span className="font-mono">{r.code}</span>
                      {r.unit_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {r.unit_name}
                          {r.unit_location && ` — ${r.unit_location}`}
                        </span>
                      )}
                      {r.campaign_title && <span>Campanha: {r.campaign_title}</span>}
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      Gerado em {dateTime(r.created_at)}
                      {r.validated_at && ` · Validado em ${dateTime(r.validated_at)}`}
                    </p>

                    {/* Dados pessoais sob demanda */}
                    {r.has_user && (
                      <div className="mt-2">
                        {user ? (
                          <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 inline-block">
                            <p className="text-xs text-white">{user.name}</p>
                            <p className="text-[11px] text-gray-500">{user.email}</p>
                            <p className="text-[10px] text-amber-500 mt-1">
                              Consulta registrada em auditoria
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => reveal(r.id)}
                            disabled={revealing === r.id}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-purple transition-colors"
                          >
                            {revealing === r.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Eye className="w-3 h-3" />}
                            Consultar usuário vinculado
                          </button>
                        )}
                      </div>
                    )}
                    {!r.has_user && (
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <X className="w-3 h-3" /> Sem usuário vinculado
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    {r.purchase_value && (
                      <p className="text-sm text-white font-medium">{brl(Number(r.purchase_value))}</p>
                    )}
                    {r.discount_applied && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1 justify-end">
                        <Percent className="w-3 h-3" /> -{brl(Number(r.discount_applied))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
