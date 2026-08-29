'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Store, ArrowLeft, Loader2, AlertTriangle, MapPin, Ticket, Megaphone,
  FileText, Users as UsersIcon, History, Sparkles, DollarSign, Check,
  Building2, Star, TrendingUp, ShieldCheck,
} from 'lucide-react';
import { adminFetchJson } from '@/lib/admin-fetch';

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Em análise', color: 'bg-amber-500/10 text-amber-500' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-400' },
  suspended: { label: 'Suspenso', color: 'bg-orange-500/10 text-orange-400' },
  inactive: { label: 'Inativo', color: 'bg-gray-600/20 text-gray-400' },
  changes_requested: { label: 'Correções solicitadas', color: 'bg-brand-blue/10 text-brand-blue' },
  draft: { label: 'Rascunho', color: 'bg-gray-600/20 text-gray-400' },
  active: { label: 'Ativa', color: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Pausada', color: 'bg-amber-500/10 text-amber-500' },
  finished: { label: 'Encerrada', color: 'bg-gray-600/20 text-gray-400' },
  expired: { label: 'Expirado', color: 'bg-gray-600/20 text-gray-400' },
  validated: { label: 'Validado', color: 'bg-emerald-500/10 text-emerald-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400' },
};

const DOC_LABEL: Record<string, string> = {
  cnpj_card: 'Cartão CNPJ', social_contract: 'Contrato social', id_document: 'Documento de identidade',
  address_proof: 'Comprovante de endereço', bank_proof: 'Comprovante bancário', other: 'Outro',
};

const AI_FEATURE_LABEL: Record<string, string> = {
  campaign_copy: 'Texto de campanha', benefit_suggestion: 'Sugestão de benefício',
  segmentation: 'Segmentação', behavior_analysis: 'Análise de comportamento',
  commercial_recommendation: 'Recomendação comercial', other: 'Outro',
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (v: string | null) => v ? new Date(v).toLocaleDateString('pt-BR') : '—';
const dateTime = (v: string | null) => v ? new Date(v).toLocaleString('pt-BR') : '—';

const Badge = ({ status }: { status: string }) => {
  const m = STATUS_META[status] ?? { label: status, color: 'bg-gray-600/20 text-gray-400' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>{m.label}</span>;
};

const TABS = [
  { id: 'overview', label: 'Visão geral', icon: TrendingUp },
  { id: 'units', label: 'Unidades', icon: Building2 },
  { id: 'benefits', label: 'Benefícios', icon: Ticket },
  { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
  { id: 'redemptions', label: 'Utilizações', icon: Check },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'team', label: 'Equipe', icon: UsersIcon },
  { id: 'ai', label: 'IA', icon: Sparkles },
  { id: 'history', label: 'Histórico', icon: History },
];

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetchJson<any>(`/api/admin/partners/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar parceiro');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-brand-purple animate-spin" /></div>;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/admin/partners" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const { partner, units, documents, members, benefits, campaigns, redemptions, history, ai_logs, revenues, summary } = data;

  return (
    <div className="space-y-6">
      <Link href="/admin/partners" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Voltar para parceiros
      </Link>

      {/* Cabeçalho */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {partner.logo_url
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={partner.logo_url} alt={partner.trade_name} className="w-full h-full object-cover" />
              : <Store className="w-7 h-7 text-gray-500" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-display font-bold text-white">{partner.trade_name}</h2>
              <Badge status={partner.status} />
            </div>
            <p className="text-sm text-gray-400 mt-1">{partner.legal_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              CNPJ {partner.tax_id} · {partner.category} · Plano {partner.plan}
            </p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
              {partner.email && <span>{partner.email}</span>}
              {partner.phone && <span>{partner.phone}</span>}
              {partner.website && <span>{partner.website}</span>}
              <span>Cadastrado em {date(partner.created_at)}</span>
            </div>
          </div>
          {partner.rating_count > 0 && (
            <div className="text-right">
              <span className="flex items-center gap-1 text-lg font-bold text-white">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {Number(partner.rating_avg).toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">{partner.rating_count} avaliações</span>
            </div>
          )}
        </div>

        {partner.rejection_reason && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-xs text-red-300"><strong>Motivo registrado:</strong> {partner.rejection_reason}</p>
          </div>
        )}
        {partner.review_notes && (
          <div className="mt-3 bg-brand-blue/10 border border-brand-blue/30 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-200"><strong>Correções solicitadas:</strong> {partner.review_notes}</p>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((t) => {
          const count =
            t.id === 'units' ? units.length :
            t.id === 'benefits' ? benefits.length :
            t.id === 'campaigns' ? campaigns.length :
            t.id === 'redemptions' ? redemptions.length :
            t.id === 'documents' ? documents.length :
            t.id === 'team' ? members.length :
            t.id === 'ai' ? ai_logs.length :
            t.id === 'history' ? history.length : null;

          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-brand-purple text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {count !== null && count > 0 && (
                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Visão geral */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Building2, label: 'Unidades ativas', value: `${summary.units_active}/${summary.units_total}` },
              { icon: Ticket, label: 'Benefícios aprovados', value: summary.benefits_approved },
              { icon: Check, label: 'Utilizações validadas', value: summary.redemptions_validated },
              { icon: UsersIcon, label: 'Usuários alcançados', value: summary.unique_users },
              { icon: TrendingUp, label: 'Novos clientes', value: summary.new_customers },
              { icon: DollarSign, label: 'Volume gerado', value: brl(summary.revenue_generated) },
              { icon: Ticket, label: 'Desconto concedido', value: brl(summary.discount_granted) },
              { icon: DollarSign, label: 'Receita p/ plataforma', value: brl(summary.platform_revenue) },
            ].map((m) => (
              <div key={m.label} className="bg-gray-800 rounded-2xl border border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <m.icon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400">{m.label}</span>
                </div>
                <p className="text-xl font-display font-bold text-white">{m.value}</p>
              </div>
            ))}
          </div>

          {summary.impressions === null && campaigns.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-300 font-medium">Métricas de exibição indisponíveis</p>
                <p className="text-xs text-gray-500 mt-1">
                  Impressões, alcance e CTR passam a ser exibidos quando o aplicativo registrar os
                  eventos de exibição e clique das campanhas. Nenhum número é estimado aqui.
                </p>
              </div>
            </div>
          )}

          {summary.pending_documents > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                {summary.pending_documents} documento(s) aguardando análise
              </p>
            </div>
          )}

          {summary.cities.length > 0 && (
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-purple" /> Cidades atendidas
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.cities.map((c: string) => (
                  <span key={c} className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unidades */}
      {tab === 'units' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {units.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-14">Nenhuma unidade cadastrada.</p>
          ) : units.map((u: any) => (
            <div key={u.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white font-medium">{u.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[u.street, u.number, u.neighborhood].filter(Boolean).join(', ')} — {u.city}/{u.state}
                </p>
                {u.phone && <p className="text-xs text-gray-500 mt-0.5">{u.phone}</p>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-600/20 text-gray-400'
              }`}>
                {u.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Benefícios */}
      {tab === 'benefits' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {benefits.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-14">Nenhum benefício cadastrado.</p>
          ) : benefits.map((b: any) => (
            <div key={b.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-medium">{b.title}</p>
                  <Badge status={b.status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {b.discount_percent ? `${b.discount_percent}% de desconto` :
                   b.discount_value ? `${brl(Number(b.discount_value))} de desconto` : b.benefit_type}
                  {' · '}Utilizações: {b.used_quantity}{b.total_quantity ? `/${b.total_quantity}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vigência: {date(b.starts_at)} até {date(b.ends_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campanhas */}
      {tab === 'campaigns' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {campaigns.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-14">Nenhuma campanha criada.</p>
          ) : campaigns.map((c: any) => (
            <div key={c.id} className="px-5 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-white font-medium">{c.title}</p>
                <Badge status={c.status} />
                <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{c.campaign_type}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {date(c.starts_at)} até {date(c.ends_at)}
                {c.budget ? ` · Orçamento ${brl(Number(c.budget))}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Utilizações */}
      {tab === 'redemptions' && (
        <div className="space-y-3">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-brand-purple flex-shrink-0" />
            <p className="text-xs text-gray-400">
              Em conformidade com a LGPD, os dados pessoais do usuário não são exibidos nesta
              listagem — apenas a confirmação de que houve um usuário vinculado à validação.
            </p>
          </div>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
            {redemptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-14">Nenhuma utilização registrada.</p>
            ) : redemptions.map((r: any) => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-white font-medium">{r.benefit_title ?? 'Benefício removido'}</p>
                    <Badge status={r.status} />
                    {r.is_new_customer && (
                      <span className="text-[10px] bg-brand-purple/10 text-brand-purple font-bold px-2 py-0.5 rounded-full">
                        novo cliente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{r.code}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.unit_name ?? 'Unidade não informada'} · {dateTime(r.validated_at ?? r.created_at)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {r.purchase_value && <p className="text-sm text-white">{brl(Number(r.purchase_value))}</p>}
                  {r.discount_applied && (
                    <p className="text-xs text-emerald-500">-{brl(Number(r.discount_applied))}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos */}
      {tab === 'documents' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-14">Nenhum documento enviado.</p>
          ) : documents.map((d: any) => (
            <div key={d.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white font-medium">{DOC_LABEL[d.doc_type] ?? d.doc_type}</p>
                <p className="text-xs text-gray-500 mt-0.5">Enviado em {date(d.created_at)}</p>
                {d.notes && <p className="text-xs text-gray-500 mt-0.5">{d.notes}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge status={d.status} />
                <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs text-brand-purple hover:underline">
                  Abrir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Equipe */}
      {tab === 'team' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-14">
              Nenhum membro com acesso ao Portal do Parceiro.
            </p>
          ) : members.map((m: any) => (
            <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white font-medium">{m.user?.name ?? 'Usuário removido'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {m.user?.email} · {m.unit_name ?? 'Todas as unidades'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] bg-gray-700 text-gray-400 font-bold px-2 py-0.5 rounded-full">
                  {m.role === 'owner' ? 'Responsável' : m.role === 'manager' ? 'Gerente' : 'Operador'}
                </span>
                {!m.is_active && (
                  <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-full">inativo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* IA */}
      {tab === 'ai' && (
        <div className="space-y-3">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-brand-purple flex-shrink-0" />
            <p className="text-xs text-gray-400">
              Este registro contém <strong className="text-gray-300">sugestões geradas por IA</strong>,
              não métricas observadas. A coluna &quot;aceita&quot; indica se o parceiro aplicou a sugestão.
            </p>
          </div>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
            {ai_logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-14">Nenhum recurso de IA utilizado.</p>
            ) : ai_logs.map((l: any) => (
              <div key={l.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white font-medium">{AI_FEATURE_LABEL[l.feature] ?? l.feature}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{dateTime(l.created_at)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  l.accepted === true ? 'bg-emerald-500/10 text-emerald-500'
                  : l.accepted === false ? 'bg-gray-600/20 text-gray-400'
                  : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {l.accepted === true ? 'aceita' : l.accepted === false ? 'descartada' : 'sem retorno'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      {tab === 'history' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 divide-y divide-gray-700/50">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-14">Nenhuma alteração registrada.</p>
          ) : history.map((h: any) => (
            <div key={h.id} className="px-5 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                {h.from_status && <Badge status={h.from_status} />}
                <span className="text-gray-600 text-xs">→</span>
                <Badge status={h.to_status} />
                <span className="text-xs text-gray-500">{dateTime(h.created_at)}</span>
              </div>
              {h.reason && <p className="text-xs text-gray-400 mt-1.5">{h.reason}</p>}
              {h.changed_by_name && <p className="text-xs text-gray-600 mt-0.5">por {h.changed_by_name}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Receitas vinculadas */}
      {tab === 'overview' && revenues.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Receitas vinculadas a este parceiro
          </h3>
          <div className="divide-y divide-gray-700/50">
            {revenues.map((r: any) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400">{r.source} · {date(r.occurred_at)}</span>
                <span className="text-sm text-white">{brl(Number(r.net_value))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
