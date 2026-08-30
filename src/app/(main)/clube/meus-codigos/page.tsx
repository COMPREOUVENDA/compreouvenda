'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ticket, AlertCircle } from 'lucide-react';
import { authFetch, authFetchJson } from '@/lib/auth-fetch';
import { useAuthStore } from '@/stores/authStore';
import RedemptionCodeCard, { type ClubRedemption } from '@/components/club/RedemptionCodeCard';

/** Códigos do usuário: os que estão prontos para usar e o histórico. */
export default function MeusCodigosPage() {
  const { user, isLoading: carregandoSessao } = useAuthStore();

  const [redemptions, setRedemptions] = useState<ClubRedemption[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await authFetch('/api/club/redemptions');
      const json = await res.json();
      if (res.status === 401) {
        setRedemptions([]);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Não foi possível carregar seus códigos');
      setRedemptions(json.redemptions ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (carregandoSessao) return;
    carregar();
  }, [carregar, carregandoSessao]);

  const cancelar = async (id: string) => {
    try {
      await authFetchJson(`/api/club/redemptions?id=${id}`, { method: 'DELETE' });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cancelar');
    }
  };

  const ativos = redemptions.filter((r) => r.status === 'pending');
  const historico = redemptions.filter((r) => r.status !== 'pending');

  if (!carregandoSessao && !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <Ticket className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="font-display mt-3 text-xl font-bold text-gray-900">
          Entre para ver seus códigos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Seus códigos do Clube de Benefícios ficam guardados na sua conta.
        </p>
        <Link
          href="/login?redirect=/clube/meus-codigos"
          className="mt-4 inline-block rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 md:pb-10">
      <Link
        href="/clube"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Clube de Benefícios
      </Link>

      <h1 className="font-display text-2xl font-bold text-gray-900">Meus códigos</h1>
      <p className="mt-1 text-sm text-gray-500">
        Apresente o código no balcão da empresa parceira para usar o benefício.
      </p>

      {erro && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </p>
      )}

      {carregando || carregandoSessao ? (
        <div className="mt-6 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      ) : redemptions.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-gray-200 p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Ticket className="h-6 w-6 text-gray-400" />
          </span>
          <h2 className="font-display mt-4 text-lg font-bold text-gray-900">
            Você ainda não gerou nenhum código
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Escolha um benefício no clube e gere seu código para usar na loja.
          </p>
          <Link
            href="/clube"
            className="mt-4 inline-block rounded-full bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white"
          >
            Ver benefícios
          </Link>
        </div>
      ) : (
        <>
          {ativos.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">
                Prontos para usar ({ativos.length})
              </h2>
              <div className="space-y-4">
                {ativos.map((r) => (
                  <RedemptionCodeCard key={r.id} redemption={r} onCancel={cancelar} />
                ))}
              </div>
            </section>
          )}

          {historico.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">
                Histórico
              </h2>
              <div className="space-y-3">
                {historico.map((r) => (
                  <RedemptionCodeCard key={r.id} redemption={r} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
