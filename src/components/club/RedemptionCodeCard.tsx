'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Clock, MapPin, Store, XCircle } from 'lucide-react';

export interface ClubRedemption {
  id: string;
  code: string;
  status: 'pending' | 'validated' | 'expired' | 'cancelled';
  expires_at: string | null;
  validated_at: string | null;
  created_at: string;
  discount_applied: number | null;
  benefit: { id: string; title: string; highlight: string; image_url: string | null } | null;
  partner: { id: string; name: string; logo_url: string | null } | null;
  unit: { id: string; name: string; city: string; state: string } | null;
}

const ROTULO: Record<ClubRedemption['status'], { texto: string; classe: string }> = {
  pending: { texto: 'Pronto para usar', classe: 'bg-emerald-50 text-emerald-700' },
  validated: { texto: 'Utilizado', classe: 'bg-gray-100 text-gray-600' },
  expired: { texto: 'Expirado', classe: 'bg-amber-50 text-amber-700' },
  cancelled: { texto: 'Cancelado', classe: 'bg-gray-100 text-gray-500' },
};

/** Tempo restante em formato humano. `null` quando não há prazo ou já venceu. */
function restante(expiraEm: string | null): string | null {
  if (!expiraEm) return null;
  const ms = new Date(expiraEm).getTime() - Date.now();
  if (ms <= 0) return null;
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.floor((ms % 3_600_000) / 60_000);
  if (horas >= 1) return `${horas}h${minutos.toString().padStart(2, '0')}`;
  return `${minutos} min`;
}

export default function RedemptionCodeCard({
  redemption,
  onCancel,
}: {
  redemption: ClubRedemption;
  onCancel?: (id: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [tempo, setTempo] = useState<string | null>(restante(redemption.expires_at));

  useEffect(() => {
    if (redemption.status !== 'pending') return;
    const t = setInterval(() => setTempo(restante(redemption.expires_at)), 30_000);
    return () => clearInterval(t);
  }, [redemption.status, redemption.expires_at]);

  const rotulo = ROTULO[redemption.status];
  const ativo = redemption.status === 'pending';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(redemption.code);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o código segue visível na tela.
    }
  };

  return (
    <div
      className={`rounded-3xl border-2 bg-white p-4 ${
        ativo ? 'border-brand-purple shadow-lg shadow-brand-purple/10' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {redemption.partner?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={redemption.partner.logo_url}
                alt={redemption.partner.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                <Store className="h-3.5 w-3.5 text-gray-400" />
              </span>
            )}
            <span className="truncate text-sm font-semibold text-gray-900">
              {redemption.partner?.name ?? 'Empresa parceira'}
            </span>
          </div>
          <p className="mt-1 truncate font-display font-bold text-gray-900">
            {redemption.benefit?.title ?? 'Benefício'}
          </p>
          <p className="text-xs text-brand-purple font-semibold">
            {redemption.benefit?.highlight}
          </p>
        </div>

        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${rotulo.classe}`}>
          {rotulo.texto}
        </span>
      </div>

      {ativo && (
        <>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-brand-purple/40 bg-brand-purple/5 p-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Apresente este código no balcão
            </p>
            <p className="font-display mt-1 text-3xl font-bold tracking-[0.25em] text-brand-purple">
              {redemption.code}
            </p>
            <button
              type="button"
              onClick={copiar}
              className="mx-auto mt-2 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:text-brand-purple"
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? 'Copiado' : 'Copiar código'}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
            {tempo ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Expira em {tempo}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="h-3.5 w-3.5" />
                Prazo encerrado
              </span>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={() => onCancel(redemption.id)}
                className="flex items-center gap-1 font-medium text-gray-400 transition hover:text-red-500"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar
              </button>
            )}
          </div>
        </>
      )}

      {redemption.unit && (
        <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5" />
          {redemption.unit.name} · {redemption.unit.city}/{redemption.unit.state}
        </p>
      )}

      {redemption.status === 'validated' && (
        <p className="mt-2 text-xs text-gray-500">
          Utilizado em{' '}
          {redemption.validated_at
            ? new Date(redemption.validated_at).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })
            : '—'}
        </p>
      )}

      {redemption.benefit && !ativo && (
        <Link
          href={`/clube/${redemption.benefit.id}`}
          className="mt-3 inline-block text-xs font-semibold text-brand-purple hover:underline"
        >
          Ver benefício
        </Link>
      )}
    </div>
  );
}
