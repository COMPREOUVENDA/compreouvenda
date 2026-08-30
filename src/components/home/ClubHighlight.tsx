'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket, ChevronRight, Store } from 'lucide-react';

interface BeneficioResumo {
  id: string;
  title: string;
  highlight: string;
  available_now: boolean;
  partner: { name: string; logo_url: string | null } | null;
  units: Array<{ city: string; state: string }>;
}

/**
 * Vitrine curta do Clube de Benefícios na página inicial.
 *
 * Não renderiza nada quando não há benefício ativo — uma seção vazia na home
 * comunicaria abandono. Enquanto o clube não tiver parceiros, a home fica
 * exatamente como era.
 */
export default function ClubHighlight({ city }: { city?: string | null }) {
  const [benefits, setBenefits] = useState<BeneficioResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '8' });
    if (city) params.set('city', city);

    fetch(`/api/club/benefits?${params.toString()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { benefits: [] }))
      .then((j) => setBenefits(j.benefits ?? []))
      .catch(() => setBenefits([]))
      .finally(() => setCarregando(false));
  }, [city]);

  if (carregando || benefits.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2 text-base font-bold text-gray-900">
          <Ticket className="h-4 w-4 text-brand-purple" />
          Clube de Benefícios
        </h2>
        <Link
          href="/clube"
          className="flex items-center gap-0.5 text-xs font-semibold text-brand-purple hover:underline"
        >
          Ver todos
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1">
        {benefits.map((b) => (
          <Link
            key={b.id}
            href={`/clube/${b.id}`}
            className="w-56 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-gray-200 bg-white transition-all hover:border-brand-purple"
          >
            <div className="bg-gradient-to-br from-brand-purple to-brand-orange p-3 text-white">
              <p className="font-display text-lg font-bold leading-tight">{b.highlight}</p>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5">
                {b.partner?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.partner.logo_url}
                    alt={b.partner.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <Store className="h-4 w-4 text-gray-300" />
                )}
                <span className="truncate text-xs font-semibold text-gray-700">
                  {b.partner?.name ?? 'Parceiro'}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{b.title}</p>
              {b.units[0] && (
                <p className="mt-1 text-[11px] text-gray-400">
                  {b.units[0].city}/{b.units[0].state}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
