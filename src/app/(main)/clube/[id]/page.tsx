'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Clock, Crown, Store, Ticket, Loader2,
  AlertCircle, CheckCircle2, Phone, Globe,
} from 'lucide-react';
import { authFetchJson, authFetch } from '@/lib/auth-fetch';
import { useAuthStore } from '@/stores/authStore';
import RedemptionCodeCard, { type ClubRedemption } from '@/components/club/RedemptionCodeCard';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface Unidade {
  id: string;
  name: string;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  phone: string | null;
}

interface DetalheBeneficio {
  id: string;
  title: string;
  description: string | null;
  highlight: string;
  min_purchase_value: number | null;
  image_url: string | null;
  terms: string | null;
  rules: string | null;
  ends_at: string | null;
  valid_weekdays: number[] | null;
  valid_hour_start: string | null;
  valid_hour_end: string | null;
  premium_only: boolean;
  per_user_limit: number | null;
  remaining: number | null;
  available_now: boolean;
  availability_note: string | null;
  partner: {
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    logo_url: string | null;
    website: string | null;
    phone: string | null;
    rating_avg: number | null;
    rating_count: number | null;
  } | null;
  units: Unidade[];
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DetalheBeneficioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [benefit, setBenefit] = useState<DetalheBeneficio | null>(null);
  const [meuCodigo, setMeuCodigo] = useState<ClubRedemption | null>(null);
  const [jaUsei, setJaUsei] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [unidadeEscolhida, setUnidadeEscolhida] = useState<string>('');
  const [gerando, setGerando] = useState(false);
  const [erroGeracao, setErroGeracao] = useState<string | null>(null);
  const [precisaPremium, setPrecisaPremium] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // A rota aceita sessão opcional: sem login, devolve só a oferta pública.
      const res = await authFetch(`/api/club/benefits/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Benefício não encontrado');

      setBenefit(json.benefit);
      setJaUsei(json.already_used ?? 0);

      if (json.my_redemption) {
        setMeuCodigo({
          ...json.my_redemption,
          benefit: {
            id: json.benefit.id,
            title: json.benefit.title,
            highlight: json.benefit.highlight,
            image_url: json.benefit.image_url,
          },
          partner: json.benefit.partner,
          unit: json.benefit.units.find((u: Unidade) => u.id === json.my_redemption.unit_id) ?? null,
        });
      } else {
        setMeuCodigo(null);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const gerarCodigo = async () => {
    if (!user) {
      router.push(`/login?redirect=/clube/${id}`);
      return;
    }

    setGerando(true);
    setErroGeracao(null);
    setPrecisaPremium(false);

    try {
      const res = await authFetch('/api/club/redemptions', {
        method: 'POST',
        body: JSON.stringify({
          benefit_id: id,
          unit_id: unidadeEscolhida || null,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.code === 'premium_required') setPrecisaPremium(true);
        // Já existe um código ativo: em vez de erro seco, mostramos o código.
        if (json.code === 'already_has_code' && json.redemption) {
          await carregar();
          return;
        }
        throw new Error(json.error || 'Não foi possível gerar o código');
      }

      await carregar();
    } catch (e) {
      setErroGeracao(e instanceof Error ? e.message : 'Erro ao gerar o código');
    } finally {
      setGerando(false);
    }
  };

  const cancelarCodigo = async (redemptionId: string) => {
    try {
      await authFetchJson(`/api/club/redemptions?id=${redemptionId}`, { method: 'DELETE' });
      await carregar();
    } catch (e) {
      setErroGeracao(e instanceof Error ? e.message : 'Erro ao cancelar');
    }
  };

  if (carregando) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="h-40 animate-pulse rounded-3xl bg-gray-100" />
        <div className="mt-4 h-64 animate-pulse rounded-3xl bg-gray-100" />
      </div>
    );
  }

  if (erro || !benefit) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="font-display mt-3 text-xl font-bold text-gray-900">
          {erro ?? 'Benefício não encontrado'}
        </h1>
        <Link
          href="/clube"
          className="mt-4 inline-block rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white"
        >
          Ver o clube
        </Link>
      </div>
    );
  }

  const limiteAtingido =
    benefit.per_user_limit != null && jaUsei >= benefit.per_user_limit;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 md:pb-10">
      <Link
        href="/clube"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Clube de Benefícios
      </Link>

      {/* Destaque da vantagem */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-purple to-brand-orange p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-3xl font-bold">{benefit.highlight}</span>
          {benefit.premium_only && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">
              <Crown className="h-3.5 w-3.5" />
              Premium
            </span>
          )}
        </div>
        <h1 className="font-display mt-2 text-xl font-bold leading-tight">{benefit.title}</h1>
        {benefit.description && <p className="mt-2 text-sm opacity-90">{benefit.description}</p>}
        {benefit.min_purchase_value ? (
          <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            Compra mínima de {brl(Number(benefit.min_purchase_value))}
          </p>
        ) : null}
      </div>

      {/* Empresa */}
      {benefit.partner && (
        <div className="mt-4 flex items-center gap-3 rounded-3xl border-2 border-gray-200 bg-white p-4">
          {benefit.partner.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={benefit.partner.logo_url}
              alt={benefit.partner.name}
              className="h-12 w-12 rounded-2xl object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Store className="h-6 w-6 text-gray-400" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display truncate font-bold text-gray-900">{benefit.partner.name}</p>
            {benefit.partner.category && (
              <p className="text-xs capitalize text-gray-500">{benefit.partner.category}</p>
            )}
          </div>
          <div className="flex gap-2">
            {benefit.partner.phone && (
              <a
                href={`tel:${benefit.partner.phone}`}
                aria-label="Telefone da empresa"
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
            {benefit.partner.website && (
              <a
                href={benefit.partner.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Site da empresa"
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200"
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Código ativo ou ação de gerar */}
      <div className="mt-4">
        {meuCodigo ? (
          <RedemptionCodeCard redemption={meuCodigo} onCancel={cancelarCodigo} />
        ) : (
          <div className="rounded-3xl border-2 border-gray-200 bg-white p-5">
            <h2 className="font-display font-bold text-gray-900">Quero usar este benefício</h2>
            <p className="mt-1 text-sm text-gray-500">
              Geramos um código exclusivo para você apresentar no balcão da empresa.
            </p>

            {benefit.units.length > 1 && (
              <label className="mt-4 block">
                <span className="text-xs font-semibold text-gray-600">
                  Onde você vai usar? (opcional)
                </span>
                <select
                  value={unidadeEscolhida}
                  onChange={(e) => setUnidadeEscolhida(e.target.value)}
                  className="mt-1 w-full rounded-2xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-purple"
                >
                  <option value="">Qualquer unidade</option>
                  {benefit.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.city}/{u.state}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!benefit.available_now && benefit.availability_note && (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                {benefit.availability_note}. Você pode gerar o código quando o benefício estiver no horário de validade.
              </p>
            )}

            {limiteAtingido && (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                Você já utilizou este benefício o número máximo de vezes permitido.
              </p>
            )}

            {erroGeracao && (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {erroGeracao}
              </p>
            )}

            {precisaPremium ? (
              <Link
                href="/premium"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-purple to-brand-orange px-4 py-3 font-semibold text-white"
              >
                <Crown className="h-4 w-4" />
                Assinar o Premium
              </Link>
            ) : (
              <button
                type="button"
                onClick={gerarCodigo}
                disabled={gerando || !benefit.available_now || limiteAtingido}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-purple px-4 py-3 font-semibold text-white transition hover:bg-brand-purple/90 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
              >
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                {gerando ? 'Gerando...' : user ? 'Gerar meu código' : 'Entrar e gerar código'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Regras */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border-2 border-gray-200 bg-white p-5">
          <h2 className="font-display font-bold text-gray-900">Quando vale</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
            {benefit.valid_weekdays && benefit.valid_weekdays.length > 0 ? (
              <li>Dias: {benefit.valid_weekdays.map((d) => DIAS[d]).join(', ')}</li>
            ) : (
              <li>Todos os dias da semana</li>
            )}
            {benefit.valid_hour_start && benefit.valid_hour_end ? (
              <li>
                Horário: das {benefit.valid_hour_start.slice(0, 5)} às{' '}
                {benefit.valid_hour_end.slice(0, 5)}
              </li>
            ) : (
              <li>Durante o horário de funcionamento da loja</li>
            )}
            {benefit.ends_at && (
              <li>
                Válido até{' '}
                {new Date(benefit.ends_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </li>
            )}
            {benefit.remaining != null && <li>Restam {benefit.remaining} unidades</li>}
            {benefit.per_user_limit != null && (
              <li>Limite de {benefit.per_user_limit} por pessoa</li>
            )}
          </ul>
        </div>

        <div className="rounded-3xl border-2 border-gray-200 bg-white p-5">
          <h2 className="font-display font-bold text-gray-900">Onde usar</h2>
          {benefit.units.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">
              A empresa ainda não cadastrou unidades para este benefício.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {benefit.units.map((u) => (
                <li key={u.id} className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <br />
                    {[u.street, u.number, u.neighborhood].filter(Boolean).join(', ')}
                    {u.street ? <br /> : null}
                    {u.city}/{u.state}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(benefit.terms || benefit.rules) && (
        <div className="mt-4 rounded-3xl border-2 border-gray-200 bg-white p-5">
          <h2 className="font-display font-bold text-gray-900">Regras e condições</h2>
          {benefit.rules && (
            <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{benefit.rules}</p>
          )}
          {benefit.terms && (
            <p className="mt-2 whitespace-pre-line text-xs text-gray-400">{benefit.terms}</p>
          )}
        </div>
      )}
    </div>
  );
}
