'use client';

import { useEffect, useState } from 'react';
import { Loader2, Info } from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

interface Resposta {
  feature: string;
  label: string;
  launched: boolean;
  total: number;
  items: Record<string, unknown>[];
  note: string | null;
}

/**
 * Painel de um recurso ainda não lançado.
 *
 * Substitui os números fixos que estavam escritos no código das telas de
 * leilões, ofertas relâmpago e vídeos. Enquanto o recurso não estiver em
 * operação, a tela diz isso — em vez de exibir um KPI inventado que ninguém
 * consegue auditar.
 */
export default function FeatureStatusPanel({
  feature,
  descricao,
  icone: Icone,
}: {
  feature: 'auctions' | 'flash_offers' | 'videos';
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
}) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    adminFetch(`/api/admin/feature-metrics?feature=${feature}`)
      .then((r) => r.json())
      .then((j) => {
        if (!ativo) return;
        if (j.error) setErro(j.error);
        else setDados(j);
      })
      .catch(() => ativo && setErro('Não foi possível carregar as métricas'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [feature]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 p-10">
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/30 p-5 text-sm text-red-300">
        {erro}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-700/50">
          <Icone className="h-6 w-6 text-gray-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-white">{dados?.label}</h3>
          <p className="mt-1 text-sm text-gray-400">{descricao}</p>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-3xl font-bold text-white tabular-nums">
              {dados?.total ?? 0}
            </span>
            <span className="text-xs text-gray-500">
              {dados?.total === 1 ? 'registro no banco' : 'registros no banco'}
            </span>
          </div>

          {dados?.note && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-900/40 bg-amber-950/30 p-3 text-xs text-amber-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {dados.note} Os indicadores aparecerão automaticamente quando o
              recurso entrar em operação.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
