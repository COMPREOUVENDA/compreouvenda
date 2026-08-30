'use client';

import Link from 'next/link';
import { MapPin, Clock, Crown, Store } from 'lucide-react';

export interface ClubBenefit {
  id: string;
  title: string;
  description: string | null;
  benefit_type: string;
  highlight: string;
  min_purchase_value: number | null;
  category: string | null;
  image_url: string | null;
  ends_at: string | null;
  premium_only: boolean;
  remaining: number | null;
  available_now: boolean;
  availability_note: string | null;
  partner: {
    id: string;
    name: string;
    category: string | null;
    logo_url: string | null;
    rating_avg: number | null;
    rating_count: number | null;
  } | null;
  units: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    neighborhood: string | null;
  }>;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function BenefitCard({ benefit }: { benefit: ClubBenefit }) {
  const cidades = Array.from(new Set(benefit.units.map((u) => u.city))).filter(Boolean);
  const local = cidades.length === 0
    ? null
    : cidades.length === 1
      ? `${benefit.units[0].city}/${benefit.units[0].state}`
      : `${cidades.length} cidades`;

  return (
    <Link
      href={`/clube/${benefit.id}`}
      className="group flex flex-col rounded-3xl border-2 border-gray-200 bg-white overflow-hidden transition-all hover:border-brand-purple hover:shadow-xl hover:shadow-brand-purple/10"
    >
      <div className="relative bg-gradient-to-br from-brand-purple to-brand-orange p-5 text-white">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-2xl font-bold leading-tight">{benefit.highlight}</span>
          {benefit.premium_only && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-bold backdrop-blur">
              <Crown className="h-3 w-3" />
              Premium
            </span>
          )}
        </div>
        {benefit.min_purchase_value ? (
          <p className="mt-1 text-xs opacity-90">
            Nas compras acima de {brl(Number(benefit.min_purchase_value))}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2">
          {benefit.partner?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={benefit.partner.logo_url}
              alt={benefit.partner.name}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
              <Store className="h-4 w-4 text-gray-400" />
            </span>
          )}
          <span className="truncate text-sm font-semibold text-gray-900">
            {benefit.partner?.name ?? 'Empresa parceira'}
          </span>
        </div>

        <h3 className="font-display font-bold text-gray-900 leading-snug line-clamp-2">
          {benefit.title}
        </h3>
        {benefit.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{benefit.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {local && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {local}
            </span>
          )}
          {/* `remaining` null significa ilimitado — não mostramos "0 restantes". */}
          {benefit.remaining != null && benefit.remaining <= 20 && (
            <span className="font-semibold text-brand-orange">
              Restam {benefit.remaining}
            </span>
          )}
        </div>

        {!benefit.available_now && benefit.availability_note && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {benefit.availability_note}
          </p>
        )}
      </div>
    </Link>
  );
}
