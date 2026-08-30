'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Ticket, MapPin, Loader2, SlidersHorizontal, X } from 'lucide-react';
import BenefitCard, { type ClubBenefit } from '@/components/club/BenefitCard';
import CampaignBanner, { type ClubCampaign } from '@/components/club/CampaignBanner';
import { useAuthStore } from '@/stores/authStore';

/**
 * Vitrine do Clube de Benefícios.
 *
 * Fecha o ciclo do clube: o administrador aprova, o parceiro publica e é aqui
 * que o benefício finalmente chega ao usuário, que gera o código e o apresenta
 * no balcão.
 */

const CATEGORIAS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'gastronomia', rotulo: 'Gastronomia' },
  { valor: 'moda', rotulo: 'Moda' },
  { valor: 'saude', rotulo: 'Saúde' },
  { valor: 'beleza', rotulo: 'Beleza' },
  { valor: 'educacao', rotulo: 'Educação' },
  { valor: 'servicos', rotulo: 'Serviços' },
  { valor: 'lazer', rotulo: 'Lazer' },
  { valor: 'automotivo', rotulo: 'Automotivo' },
];

export default function ClubePage() {
  const { user } = useAuthStore();

  const [benefits, setBenefits] = useState<ClubBenefit[]>([]);
  const [campaigns, setCampaigns] = useState<ClubCampaign[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [categoria, setCategoria] = useState('');
  const [cidade, setCidade] = useState('');
  const [filtrarPelaMinhaCidade, setFiltrarPelaMinhaCidade] = useState(false);

  // A cidade do perfil é a melhor pista disponível sem pedir permissão de GPS.
  const cidadeDoPerfil = user?.city ?? '';

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (buscaAplicada) params.set('q', buscaAplicada);
      if (categoria) params.set('category', categoria);
      if (cidade) params.set('city', cidade);

      const [rb, rc] = await Promise.all([
        fetch(`/api/club/benefits?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/club/campaigns${cidade ? `?city=${encodeURIComponent(cidade)}` : ''}`, { cache: 'no-store' }),
      ]);

      const jb = await rb.json();
      if (!rb.ok) throw new Error(jb.error || 'Não foi possível carregar os benefícios');
      setBenefits(jb.benefits ?? []);

      const jc = await rc.json().catch(() => ({ campaigns: [] }));
      setCampaigns(rc.ok ? jc.campaigns ?? [] : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
      setBenefits([]);
    } finally {
      setCarregando(false);
    }
  }, [buscaAplicada, categoria, cidade]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternarMinhaCidade = () => {
    if (filtrarPelaMinhaCidade) {
      setFiltrarPelaMinhaCidade(false);
      setCidade('');
    } else if (cidadeDoPerfil) {
      setFiltrarPelaMinhaCidade(true);
      setCidade(cidadeDoPerfil);
    }
  };

  const temFiltro = !!(buscaAplicada || categoria || cidade);

  const limparFiltros = () => {
    setBusca('');
    setBuscaAplicada('');
    setCategoria('');
    setCidade('');
    setFiltrarPelaMinhaCidade(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
              Clube de Benefícios
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Descontos e vantagens exclusivas em empresas parceiras perto de você.
            </p>
          </div>

          <Link
            href="/clube/meus-codigos"
            className="flex items-center gap-2 rounded-full bg-brand-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-purple/90"
          >
            <Ticket className="h-4 w-4" />
            Meus códigos
          </Link>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="mb-6">
          <CampaignBanner campaigns={campaigns} />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBuscaAplicada(busca.trim());
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar benefício ou empresa"
              aria-label="Buscar benefício"
              className="w-full rounded-2xl border-2 border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-purple"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setCategoria(c.valor)}
              className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition ${
                categoria === c.valor
                  ? 'border-brand-purple bg-brand-purple text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {c.rotulo}
            </button>
          ))}

          {cidadeDoPerfil && (
            <button
              type="button"
              onClick={alternarMinhaCidade}
              className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition ${
                filtrarPelaMinhaCidade
                  ? 'border-brand-orange bg-brand-orange text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {cidadeDoPerfil}
            </button>
          )}

          {temFiltro && (
            <button
              type="button"
              onClick={limparFiltros}
              className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-gray-400 transition hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      {carregando ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      ) : erro ? (
        <div className="rounded-3xl border-2 border-red-100 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700">{erro}</p>
          <button
            type="button"
            onClick={carregar}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : benefits.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <SlidersHorizontal className="h-6 w-6 text-gray-400" />
          </span>
          <h2 className="font-display mt-4 text-lg font-bold text-gray-900">
            {temFiltro ? 'Nenhum benefício com esses filtros' : 'Ainda não há benefícios disponíveis'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            {temFiltro
              ? 'Tente ampliar a busca ou remover os filtros.'
              : 'Estamos trazendo as primeiras empresas parceiras. Volte em breve para conferir as vantagens.'}
          </p>
          {temFiltro && (
            <button
              type="button"
              onClick={limparFiltros}
              className="mt-4 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">
            {benefits.length} {benefits.length === 1 ? 'benefício disponível' : 'benefícios disponíveis'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <BenefitCard key={b.id} benefit={b} />
            ))}
          </div>
        </>
      )}

      {carregando && benefits.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-brand-purple" />
        </div>
      )}
    </div>
  );
}
